import { motion } from 'framer-motion';
import React from 'react';

interface Props {
  children: React.ReactNode;
  index?: number;  // for stagger delay
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

const AnimatedCard: React.FC<Props> = ({ children, index = 0, style, className, onClick }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      duration: 0.3,
      delay: index * 0.05,
      ease: [0.4, 0, 0.2, 1]
    }}
    whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
    style={style}
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export default AnimatedCard;
