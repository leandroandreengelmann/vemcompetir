import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    rightElement?: React.ReactNode;
    className?: string;
    descriptionClassName?: string;
}

export function SectionHeader({
    title,
    description,
    icon: Icon,
    rightElement,
    className,
    descriptionClassName
}: SectionHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className="p-2.5 bg-primary/5 rounded-xl text-primary border border-primary/10">
                        <Icon className="h-6 w-6" />
                    </div>
                )}
                <div className="space-y-1">
                    <h1 className="text-h1 tracking-tight">{title}</h1>
                    {description && (
                        <p className={cn("text-caption text-muted-foreground", descriptionClassName)}>
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {rightElement && (
                <div className="flex items-center gap-3">
                    {rightElement}
                </div>
            )}
        </div>
    );
}
