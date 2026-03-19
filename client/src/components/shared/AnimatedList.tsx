import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

export const AnimatedList: React.FC<Props> = ({ children }) => (
  <motion.div variants={listVariants} initial="hidden" animate="visible">
    {children}
  </motion.div>
);

export const AnimatedItem: React.FC<Props> = ({ children }) => (
  <motion.div variants={itemVariants}>
    {children}
  </motion.div>
);
