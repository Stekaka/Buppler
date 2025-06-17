export interface BubbleProps {
    position: { x: number; y: number };
    onClick: () => void;
}

export interface AutoClickerProps {
    cost: number;
    quantity: number;
    onPurchase: () => void;
}

export interface CurrencyDisplayProps {
    currency: number;
}