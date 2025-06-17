import React from "react";

interface ResourceDisplayProps {
    name: string;
    icon: React.ReactNode;
    value: React.ReactNode;
    className?: string;
}

const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ name, icon, value, className }) => (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-blue-900">{value}</span>
        <span className="text-sm text-blue-600">{name}</span>
    </div>
);

export default ResourceDisplay;