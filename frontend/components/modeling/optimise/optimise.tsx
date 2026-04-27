import { motion } from "framer-motion";
import OptimiseSecOne from "./optimise-sec-one/optimise-sec-one";
import OptimiseSecTwo from "./optimise-sec-two/optimise-sec-two";
import OptimiseSecThree from "./optimise-sec-three/optimise-sec-three";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

/**
 * Optimise
 * Layout component that assembles the various sections of the optimization workspace.
 * Responsible for arranging OptimiseSecOne, OptimiseSecTwo, and OptimiseSecThree.
 */
export function Optimise() {
  return (
    <motion.div
      className="space-y-6 p-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        className="flex flex-col lg:flex-row gap-6 w-full"
        variants={itemVariants}
      >
        <div className="w-full lg:w-1/4">
          <OptimiseSecOne />
        </div>

        <div className="w-full lg:w-3/4">
          <OptimiseSecTwo />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <OptimiseSecThree />
      </motion.div>
    </motion.div>
  );
}
