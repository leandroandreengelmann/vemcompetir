export type ParsedCsv = {
    separator: string;
    headers: string[];
    rows: Record<string, string>[];
};

const CANDIDATES = [',', ';', '\t', '|'];

function detectSeparator(headerLine: string): string {
    let best = ',';
    let bestCount = -1;
    for (const sep of CANDIDATES) {
        const count = headerLine.split(sep).length;
        if (count > bestCount) {
            best = sep;
            bestCount = count;
        }
    }
    return best;
}

function splitCsvLine(line: string, sep: string): string[] {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === sep && !inQuotes) {
            out.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    out.push(current);
    return out.map((v) => v.trim());
}

export function parseCsv(text: string): ParsedCsv {
    const cleaned = text.replace(/^\uFEFF/, '');
    const lines = cleaned.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return { separator: ',', headers: [], rows: [] };

    const separator = detectSeparator(lines[0]);
    const rawHeaders = splitCsvLine(lines[0], separator);
    const headers = rawHeaders.map((h, idx) => (h.length ? h : `col_${idx + 1}`));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = splitCsvLine(lines[i], separator);
        if (values.every((v) => v === '')) continue;
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] ?? '';
        });
        rows.push(obj);
    }

    return { separator, headers, rows };
}
