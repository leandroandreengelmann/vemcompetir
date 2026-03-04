import sys

with open("src/app/chaveamento/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

start_str = '{/* Lista de Fases Agrupadas */}'
end_str = '{/* Rodapé da Página */}'

start_idx = text.find(start_str)
end_idx = text.find(end_str, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries")
    sys.exit(1)

new_content = """{/* Lista de Fases Agrupadas */}
                                    <div className="flex-1 content-start mt-2 flex flex-col gap-6 w-full">
                                        {page.rounds.map((rConfig, rIdx) => (
                                            <div key={`pdf-r-${pIdx}-${rIdx}`} className="w-full">
                                                <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-5 border-b border-gray-200 pb-2">
                                                    {rConfig.name}
                                                </h3>
                                                <div className="grid grid-cols-4 gap-x-6 gap-y-8 w-full">
                                                    {rConfig.matches.map((match) => (
                                                        <div key={match.globalId} className="relative h-[90px] w-full shrink-0 flex flex-col justify-between py-1 bg-white rounded-lg border border-gray-300 shadow-sm px-3">
                                                            
                                                            {/* MARCADOR LUTA X */}
                                                            <div className="absolute -top-3 -left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                                                {`LUTA ${match.globalId}`}
                                                            </div>
                                                            
                                                            {/* Atleta A */}
                                                            <div className="h-10 flex flex-col justify-end border-b border-gray-300 pb-1 relative">
                                                                {match.athleteA === "BYE" ? (
                                                                    <span className="text-[14px] font-bold text-gray-400 uppercase w-full">BYE</span>
                                                                ) : match.athleteA ? (
                                                                    <div className="flex flex-col leading-tight pr-4">
                                                                        <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteA}</span>
                                                                        {match.teamA && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamA}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium text-gray-400 italic">
                                                                        {match.originAText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Atleta B */}
                                                            <div className="h-10 flex flex-col justify-end pb-1 relative">
                                                                {match.athleteB === "BYE" ? (
                                                                    <span className="text-[14px] font-bold text-gray-400 uppercase w-full">BYE</span>
                                                                ) : match.athleteB ? (
                                                                    <div className="flex flex-col leading-tight pr-4">
                                                                        <span className="text-[13px] font-bold text-black uppercase truncate">{match.athleteB}</span>
                                                                        {match.teamB && <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{match.teamB}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium text-gray-400 italic">
                                                                        {match.originBText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Pódio na última página */}
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
                                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-0.5 rounded shadow-sm whitespace-nowrap ${pos.color}`}>
                                                                {pos.label}
                                                            </div>
                                                            <div className="border-b border-gray-300 h-6 w-full flex items-end pb-1 mb-2">
                                                                <span className="text-[10px] text-gray-400 italic">Nome:</span>
                                                            </div>
                                                            <div className="border-b border-gray-300 h-6 w-full flex items-end pb-1">
                                                                <span className="text-[10px] text-gray-400 italic">Equipe:</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    """

text = text[:start_idx] + new_content + text[end_idx:]

with open("src/app/chaveamento/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCCESS")
