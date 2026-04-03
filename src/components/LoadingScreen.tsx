import { motion } from "framer-motion";

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      {/* Animated logo/icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <motion.div
          className="absolute w-16 h-16 rounded-full border-2 border-primary/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute w-12 h-12 rounded-full border-2 border-primary/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner spinning arc */}
        <motion.div
          className="w-10 h-10 rounded-full border-[3px] border-transparent border-t-primary border-r-primary"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-muted-foreground tracking-wide">
          SisErgon
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
