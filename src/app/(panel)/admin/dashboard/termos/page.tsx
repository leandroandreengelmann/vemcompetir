import { getActiveTermAction, getAllTermsAction, getTermAcceptancesAction } from './actions';
import { TermsEditor } from './TermsEditor';
import { TermAcceptancesList } from './TermAcceptancesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileTextIcon } from '@phosphor-icons/react/dist/ssr';

export default async function TermosPage() {
    const [activeTerm, allTerms, acceptances] = await Promise.all([
        getActiveTermAction(),
        getAllTermsAction(),
        getTermAcceptancesAction(1, ''),
    ]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                    <FileTextIcon size={24} weight="duotone" className="text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Termo de Responsabilidade</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie o termo e veja os aceites registrados pelos atletas.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="termo">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="termo" className="flex-1 sm:flex-none">
                        Termo Ativo
                    </TabsTrigger>
                    <TabsTrigger value="aceites" className="flex-1 sm:flex-none">
                        Aceites
                        {acceptances.total > 0 && (
                            <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {acceptances.total}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="termo" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <TermsEditor activeTerm={activeTerm} allTerms={allTerms} />
                    </div>
                </TabsContent>

                <TabsContent value="aceites" className="mt-4">
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <TermAcceptancesList
                            initialData={acceptances.data}
                            initialTotal={acceptances.total}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
