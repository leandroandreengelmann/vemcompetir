import { listTemplates } from '../actions';
import { TemplatesClient } from './TemplatesClient';

export default async function TemplatesPage() {
    const templates = await listTemplates();
    return <TemplatesClient templates={templates as any} />;
}
