import { getEvolutionConfig } from '../actions';
import { ConfigForm } from './ConfigForm';

export default async function NotificacoesConfigPage() {
    const config = await getEvolutionConfig();
    return <ConfigForm initialConfig={config} />;
}
