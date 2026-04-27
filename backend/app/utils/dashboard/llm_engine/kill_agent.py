"""
Example demonstrating how to cancel a running agent execution.

This example shows how to:
1. Start an agent run in a separate thread
2. Cancel the run from another thread
3. Handle the cancelled response
"""

import threading

from agno.agent import Agent
from agno.run.agent import RunEvent
from agno.run.base import RunStatus

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
                print(chunk.content, end="", flush=True)
                content_pieces.append(chunk.content)
            # run cancelled -> emit RunEvent.run_cancelled
            elif chunk.event == RunEvent.run_cancelled:
                print(f"\nRun was cancelled: {chunk.run_id}")
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
    print(f"Will cancel run in {delay_seconds} seconds...")

    # Wait for delay OR until run completes (whichever comes first)
    if run_completed.wait(timeout=delay_seconds):
        print("Run completed before cancellation delay - skipping cancel")
        return

    # If we get here, timeout elapsed and run is still going
    run_id = run_id_container.get("run_id")
    if run_id:
        print(f"Cancelling run: {run_id}")
        success = agent.cancel_run(run_id)
        if success:
            print(f"Run {run_id} marked for cancellation")
        else:
            print(f"Failed to cancel run {run_id}")


def kill_function(agent: Agent, query: str):
    """Main function demonstrating agent run cancellation."""

    print("Starting agent run cancellation example...")
    print("=" * 50)

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
    print("Starting agent run thread...")
    agent_thread.start()

    print("Starting cancellation thread...")
    cancel_thread.start()

    # Wait for both threads to complete
    print("Waiting for threads to complete...")
    agent_thread.join()
    cancel_thread.join()

    # Print the results
    print("\n" + "=" * 50)
    print("RESULTS:")
    print("=" * 50)

    result = run_id_container.get("result")
    if result:
        print(f"Status: {result['status']}")
        print(f"Run ID: {result['run_id']}")
        print(f"Was Cancelled: {result['cancelled']}")

        if result.get("error"):
            print(f"Error: {result['error']}")
        else:
            print(f"Content Preview: {result['content']}")

        if result["cancelled"]:
            print("\nSUCCESS: Run was successfully cancelled!")
        else:
            print("\nWARNING: Run completed before cancellation")
    else:
        print("No result obtained - check if cancellation happened during streaming")

    print("\nExample completed!")
    return result
