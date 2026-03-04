'use client';

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAthleteCart } from "@/hooks/use-athlete-cart";
import { toast } from "sonner";

export function ReactivatePaymentButton({ registrationId }: { registrationId: string }) {
    const { reactivateItem, setOpen } = useAthleteCart();
    const [isLoading, setIsLoading] = useState(false);

    const handleReactivate = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();

        try {
            setIsLoading(true);
            await reactivateItem(registrationId);
            setOpen(true);
            toast.success('Inscrição reativada', {
                description: 'O item voltou para sua cesta. Você já pode tentar realizar o pagamento novamente.',
            });
        } catch (error) {
            console.error('Falha ao reativar:', error);
            toast.error('Erro ao reativar', {
                description: 'Ocorreu um erro ao tentar devolver a inscrição para a cesta.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            onClick={handleReactivate}
            disabled={isLoading}
            className="h-7 text-[10px] font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 px-2 sm:px-3 shadow-none uppercase tracking-wider rounded-md"
        >
            <RotateCcw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "Aguarde..." : "Refazer Pagamento"}
        </Button>
    );
}
