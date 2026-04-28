"""
Example demonstrating how to cancel a running agent execution.

This example shows how to:
1. Start an agent run in a separate thread
2. Cancel the run from another thread
3. Handle the cancelled response
"""

import logging
import threading

from agno.agent import Agent
from agno.run.agent import RunEvent
from agno.run.base import RunStatus

logger = logging.getLogger(__name__)

run_completed = threading.Event()


def long_running_task(agent: Agent, query: str, run_id_container: dict):
    """
    Simulate a long-running agent task that can be cancelled.

    Args:
        agent: The agent to run
        run_id_container: Dictionary to store the run_id for cancellation

    Returns:
        Dictionary with run results and status
    """
    # Start the agent run - this simulates a long task
    try:
        final_response = None
        content_pieces = []

        for chunk in agent.run(input=query, stream=True, debug_mode=True):
            if "run_id" not in run_id_container and chunk.run_id:
                run_id_container["run_id"] = chunk.run_id

            if chunk.event == RunEvent.run_content:
                logger.debug("%s", chunk.content)
                print(chunk.content, end="", flush=True)
                content_pieces.append(chunk.content)
            # run cancelled -> emit RunEvent.run_cancelled
            elif chunk.event == RunEvent.run_cancelled:
                logger.info("Run was cancelled: %s", chunk.run_id)
                run_id_container["result"] = {
                    "status": "cancelled",
                    "run_id": chunk.run_id,
                    "cancelled": True,
                    "content": (
                        "".join(content_pieces)
                        if content_pieces
                        else "No content before cancellation"
                    ),
                }
                return
            elif hasattr(chunk, "status") and chunk.status == RunStatus.completed:
                final_response = chunk

        # If we get here, the run completed successfully
        if final_response:
            run_id_container["result"] = {
                "status": (
                    final_response.status.value
                    if final_response.status
                    else "completed"
                ),
                "run_id": final_response.run_id,
                "cancelled": final_response.status == RunStatus.cancelled,
                "content": "".join(content_pieces) if content_pieces else "No content",
            }
        else:
            run_id_container["result"] = {
                "status": "unknown",
                "run_id": run_id_container.get("run_id"),
                "cancelled": False,
                "content": "".join(content_pieces) if content_pieces else "No content",
            }
    finally:
        run_completed.set()


def cancel_after_delay(agent: Agent, run_id_container: dict, delay_seconds: int):
    """Cancel the agent run after delay, unless run completes first."""
    logger.info("Will cancel run in %s seconds", delay_seconds)

    # Wait for delay OR until run completes (whichever comes first)
    if run_completed.wait(timeout=delay_seconds):
        logger.info("Run completed before cancellation delay - skipping cancel")
        return

    # If we get here, timeout elapsed and run is still going
    run_id = run_id_container.get("run_id")
    if run_id:
        logger.info("Cancelling run: %s", run_id)
        success = agent.cancel_run(run_id)
        if success:
            logger.info("Run %s marked for cancellation", run_id)
        else:
            logger.warning("Failed to cancel run %s", run_id)


def kill_function(agent: Agent, query: str):
    """Main function demonstrating agent run cancellation."""

    logger.info("Starting agent run cancellation example")
    logger.debug("=" * 50)

    # Container to share run_id between threads
    run_id_container = {}

    # Start the agent run in a separate thread
    agent_thread = threading.Thread(
        target=lambda: long_running_task(
            agent=agent, query=query, run_id_container=run_id_container
        ),
        name="AgentRunThread",
    )

    # Start the cancellation thread
    cancel_thread = threading.Thread(
        target=cancel_after_delay,
        args=(agent, run_id_container, 100),  # Cancel after 8 seconds
        name="CancelThread",
    )

    # Start both threads
    logger.debug("Starting agent run thread...")
    agent_thread.start()

    logger.debug("Starting cancellation thread...")
    cancel_thread.start()

    # Wait for both threads to complete
    logger.debug("Waiting for threads to complete...")
    agent_thread.join()
    cancel_thread.join()

    # Print the results
    logger.debug("\n" + "=" * 50)
    logger.info("RESULTS:")
    logger.debug("=" * 50)

    result = run_id_container.get("result")
    if result:
        logger.info("Status: %s, Run ID: %s, Cancelled: %s",
            result['status'], result['run_id'], result['cancelled'])

        if result.get("error"):
            logger.error("Error: %s", result['error'])
        else:
            logger.debug("Content Preview: %.100s", result['content'])

        if result["cancelled"]:
            logger.info("SUCCESS: Run was successfully cancelled!")
        else:
            logger.warning("WARNING: Run completed before cancellation")
    else:
        logger.warning("No result obtained")

    logger.info("Example completed!")
    return result
