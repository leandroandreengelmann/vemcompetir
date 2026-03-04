import sys

with open("src/app/chaveamento/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Trocar a lógica de paginação para considerar o Pódio
old_logic = """                            enrichedRounds.forEach((round) => {
                                const matchRows = Math.ceil(round.matches.length / 4);
                                const roundUnits = 3 + (matchRows * 4); // 3 (título) + 4 por linha de 4 lutas

                                if (roundUnits > MAX_UNITS) {"""

new_logic = """                            enrichedRounds.forEach((round, rIdx) => {
                                const matchRows = Math.ceil(round.matches.length / 4);
                                const roundUnits = 3 + (matchRows * 4); // 3 (título) + 4 por linha de 4 lutas
                                const isLastRound = rIdx === enrichedRounds.length - 1;
                                const podiumUnits = isLastRound ? 8 : 0; // Reserva 8 unidades pro Pódio se for o último round

                                if (roundUnits > MAX_UNITS) {"""

text = text.replace(old_logic, new_logic)

old_condition = """                                    // Round cabe inteiro numa página, mas cabe junto com o que já tem na atual?
                                    if (currentPageUnits + roundUnits > MAX_UNITS && currentPageRounds.length > 0) {"""

new_condition = """                                    // Round cabe inteiro numa página, mas cabe junto com o que já tem na atual?
                                    if ((currentPageUnits + roundUnits + podiumUnits) > MAX_UNITS && currentPageRounds.length > 0) {"""

text = text.replace(old_condition, new_condition)

# Refinar os margins do Pódio para ficar mais apertado e certeiro
old_podium = """                                        {/* Pódio na última página */}
                                        {pIdx === pages.length - 1 && (
                                            <div className="mt-8 w-full border-t-2 border-dashed border-gray-300 pt-8 mt-auto">
                                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest mb-8 text-center">
                                                    Pódio Oficial
                                                </h3>
                                                <div className="flex flex-row justify-center gap-6 w-full mt-4 pb-8">
                                                    {[
                                                        { label: "1º LUGAR (CAMPEÃO)", color: "bg-yellow-500" },
                                                        { label: "2º LUGAR (VICE)", color: "bg-gray-400" },
                                                        { label: "3º LUGAR", color: "bg-[#cd7f32]" }
                                                    ].map((pos, idx) => (
                                                        <div key={idx} className="relative w-[240px] flex flex-col justify-end pt-8 pb-3 bg-white rounded-lg border border-gray-300 shadow-sm px-4 h-[80px]">
                                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-0.5 rounded shadow-sm whitespace-nowrap ${pos.color}`}>"""

new_podium = """                                        {/* Pódio na última página */}
                                        {pIdx === pages.length - 1 && (
                                            <div className="mt-6 w-full border-t-2 border-dashed border-gray-300 pt-6 mt-auto shrink-0">
                                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-6 text-center">
                                                    Pódio Oficial
                                                </h3>
                                                <div className="flex flex-row justify-center gap-6 w-full mt-2 pb-4">
                                                    {[
                                                        { label: "1º LUGAR (CAMPEÃO)", color: "bg-yellow-500" },
                                                        { label: "2º LUGAR (VICE)", color: "bg-gray-400" },
                                                        { label: "3º LUGAR", color: "bg-[#cd7f32]" }
                                                    ].map((pos, idx) => (
                                                        <div key={idx} className="relative w-[240px] flex flex-col justify-end pt-6 pb-2 bg-white rounded-lg border border-gray-300 shadow-sm px-4 h-[75px]">
                                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-0.5 rounded shadow-sm whitespace-nowrap ${pos.color}`}>"""

text = text.replace(old_podium, new_podium)

with open("src/app/chaveamento/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("LAYOUT_FIXED")
