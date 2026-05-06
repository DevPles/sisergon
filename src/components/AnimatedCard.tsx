import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const AnimatedCard = ({ children, index = 0, className, style, onClick, onMouseEnter, onMouseLeave }: AnimatedCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
    whileTap={{ scale: 0.98 }}
    className={className}
    style={style}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {children}
  </motion.div>
);

export default AnimatedCard;
