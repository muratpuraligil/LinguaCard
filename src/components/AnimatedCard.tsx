import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

interface AnimatedCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
    onClick?: () => void;
    delay?: number;
}

const ROTATION_RANGE = 20; // Max rotation in degrees
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2;

const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    className = "",
    glowColor = "#60a5fa", // Default blue-400
    onClick,
    delay = 0
}) => {
    const ref = useRef<HTMLDivElement>(null);

    // Motion values for mouse position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring physics for rotation
    const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

    // Calculate rotation based on mouse position
    // Note: To rotate around X axis (tilt up/down), we use Y position.
    // To rotate around Y axis (tilt left/right), we use X position (inverted).
    const rotateX = useTransform(ySpring, [-0.5, 0.5], [ROTATION_RANGE, -ROTATION_RANGE]);
    const rotateY = useTransform(xSpring, [-0.5, 0.5], [-ROTATION_RANGE, ROTATION_RANGE]);

    // Lift effect on hover (Z-axis translation + Scale)
    // We'll handle this purely in the `whileHover` prop for simplicity and performance

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate normalized position (-0.5 to 0.5) from center
        const xPct = (mouseX / width) - 0.5;
        const yPct = (mouseY / height) - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Dynamic glow gradient based on mouse position
    // We map -0.5 -> 0% and 0.5 -> 100% approximately
    const bgX = useTransform(xSpring, [-0.5, 0.5], ["0%", "100%"]);
    const bgY = useTransform(ySpring, [-0.5, 0.5], ["0%", "100%"]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            whileHover={{
                scale: 1.02,
                y: -5,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)" // tailwind shadow-2xl equivalent
            }}
            whileTap={{ scale: 0.98 }}
            className={`relative group cursor-pointer ${className}`}
        >
            {/* Glassmorphism Background & Border */}
            <div
                className="absolute inset-0 rounded-[32px] bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
                style={{ transform: "translateZ(0)" }} // GPU force
            >
                {/* Enhanced Soft Glow / Spotlight */}
                <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background: useMotionTemplate`
                          radial-gradient(
                            500px circle at ${bgX} ${bgY}, 
                            ${glowColor}33, 
                            transparent 80%
                          )
                        `
                    }}
                />
            </div>

            {/* Content Container (Lifted slightly in Z-space) */}
            <div
                className="relative z-10 h-full w-full rounded-[32px] p-[1px]" // p-[1px] creates room if we want gradient border
                style={{ transform: "translateZ(20px)" }}
            >
                {children}
            </div>
        </motion.div>
    );
};

export default AnimatedCard;
