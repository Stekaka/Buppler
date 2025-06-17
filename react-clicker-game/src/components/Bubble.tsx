import React, { useMemo, useRef, useState } from "react";

interface BubbleProps {
    position: { x: number };
    onPop: (screenPos: { x: number; y: number }) => void;
}

const Bubble: React.FC<BubbleProps> = ({ position, onPop }) => {
    const [popped, setPopped] = useState(false);
    const bubbleRef = useRef<HTMLDivElement>(null);

    // Randomize size, duration, and horizontal drift
    const { size, floatDuration, xDrift } = useMemo(() => {
        const size = 48 + Math.random() * 32;
        const floatDuration = 3.5 + Math.random() * 2.5;
        const xDrift = (Math.random() - 0.5) * 120; // -60px to +60px
        return { size, floatDuration, xDrift };
    }, []);

    const handlePop = () => {
        if (bubbleRef.current) {
            const rect = bubbleRef.current.getBoundingClientRect();
            onPop({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        setPopped(true);
        setTimeout(() => {
            // ...existing onPop logic if needed...
        }, 400);
    };

    return (
        <div
            ref={bubbleRef}
            className="absolute cursor-pointer select-none"
            style={{
                left: position.x,
                bottom: 0,
                width: size,
                height: size,
                zIndex: 10,
                pointerEvents: popped ? "none" : "auto",
                animation: !popped
                    ? `bubble-float-up ${floatDuration}s linear forwards`
                    : undefined,
                // @ts-ignore
                "--bubble-x-drift": `${xDrift}px`,
            }}
            onClick={handlePop}
        >
            <div className={`bubble-visual ${popped ? "bubble-pop" : ""}`}>
                <div className="bubble-highlight" />
            </div>
        </div>
    );
};

export default Bubble;