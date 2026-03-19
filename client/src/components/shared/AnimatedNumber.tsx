import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import React, { useEffect } from 'react';

interface Props {
  value: number;
  duration?: number;
  style?: React.CSSProperties;
}

const AnimatedNumber: React.FC<Props> = ({ value, duration = 0.8, style }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration });
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, duration, count, rounded]);

  return <span style={style}>{display}</span>;
};

export default AnimatedNumber;
