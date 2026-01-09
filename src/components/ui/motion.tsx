import { motion, HTMLMotionProps, Variants, Transition } from "framer-motion";
import React from "react";

// macOS-style spring animations (typed correctly)
export const macOSSpring: Transition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export const macOSSoft: Transition = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
  mass: 1,
};

export const macOSBounce: Transition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 20,
  mass: 0.6,
};

// Variants for different animation patterns
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const scaleOnHover: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

// Animated Card Component
interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, delay = 0, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ 
          type: "spring" as const, 
          stiffness: 200, 
          damping: 25, 
          mass: 1,
          delay 
        }}
        whileHover={{ 
          y: -4, 
          scale: 1.01,
          transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 }
        }}
        whileTap={{ scale: 0.99 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

// Animated Button Component
interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ 
          scale: 1.02,
          y: -2,
          transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 }
        }}
        whileTap={{ 
          scale: 0.97,
          transition: { duration: 0.1 }
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";

// Animated Container with stagger
interface MotionContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  stagger?: boolean;
}

export const MotionContainer = React.forwardRef<HTMLDivElement, MotionContainerProps>(
  ({ children, stagger = true, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={stagger ? staggerContainer : undefined}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionContainer.displayName = "MotionContainer";

// Animated Item for use inside MotionContainer
interface MotionItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const MotionItem = React.forwardRef<HTMLDivElement, MotionItemProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={fadeInUp}
        transition={{ type: "spring" as const, stiffness: 200, damping: 25, mass: 1 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionItem.displayName = "MotionItem";

// Page transition wrapper
interface MotionPageProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const MotionPage = React.forwardRef<HTMLDivElement, MotionPageProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          type: "spring" as const,
          stiffness: 260,
          damping: 30,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionPage.displayName = "MotionPage";

// Sidebar item with macOS-style animations
interface MotionSidebarItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  isActive?: boolean;
}

export const MotionSidebarItem = React.forwardRef<HTMLDivElement, MotionSidebarItemProps>(
  ({ children, isActive = false, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ 
          x: 4,
          backgroundColor: "hsla(0, 0%, 100%, 0.08)",
          transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 }
        }}
        whileTap={{ scale: 0.98 }}
        animate={isActive ? {
          backgroundColor: "hsla(211, 100%, 50%, 0.15)",
          scale: 1,
        } : {
          backgroundColor: "transparent",
          scale: 1,
        }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 25, mass: 1 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionSidebarItem.displayName = "MotionSidebarItem";

// Floating/hovering animation
export const MotionFloat = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      animate={{ 
        y: [0, -6, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Pulse glow animation for CTAs
export const MotionGlow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      animate={{
        boxShadow: [
          "0 0 20px hsla(211, 100%, 50%, 0.3)",
          "0 0 40px hsla(211, 100%, 50%, 0.5)",
          "0 0 20px hsla(211, 100%, 50%, 0.3)",
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// List item animation helper
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 25,
      mass: 1,
    },
  },
};

export { motion, type Variants };
