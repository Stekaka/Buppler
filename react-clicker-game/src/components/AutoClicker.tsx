import React from 'react';

interface AutoClickerProps {
    autoClickers: number;
    currency: number;
    buyAutoClicker: () => void;
    autoClickerCost: number;
}

const AutoClicker: React.FC<AutoClickerProps> = ({ autoClickers, currency, buyAutoClicker, autoClickerCost }) => {
    return (
        <div>
            <h2>Auto Clicker</h2>
            <p>Auto Clickers Owned: {autoClickers}</p>
            <p>Cost: {autoClickerCost} Currency</p>
            <button onClick={buyAutoClicker} disabled={currency < autoClickerCost}>
                Buy Auto Clicker
            </button>
        </div>
    );
};

export default AutoClicker;