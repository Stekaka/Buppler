import React from 'react';

interface CurrencyDisplayProps {
    currency: number;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ currency }) => {
    return (
        <div>
            <h2>Currency: {currency}</h2>
        </div>
    );
};

export default CurrencyDisplay;