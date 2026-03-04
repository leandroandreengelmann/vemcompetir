import sys

with open("src/app/chaveamento/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

podium_section = """
                                        {/* Pódio na última página */}
                                        {pIdx === pages.length - 1 && (
                                            <div className="mt-8 w-full">
                                                <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-6 border-b border-gray-200 pb-2">
                                                    Pódio Oficial
                                                </h3>
                                                <div className="grid grid-cols-4 gap-6 w-full mt-4">
                                                    {[
                                                        { label: "1º LUGAR (CAMPEÃO)", color: "bg-yellow-500" },
                                                        { label: "2º LUGAR (VICE)", color: "bg-gray-400" },
                                                        { label: "3º LUGAR", color: "bg-[#cd7f32]" },
                                                        { label: "3º LUGAR", color: "bg-[#cd7f32]" }
                                                    ].map((pos, idx) => (
                                                        <div key={idx} className="relative w-full flex flex-col justify-end pt-8 pb-3 bg-white rounded-lg border border-gray-300 shadow-sm px-4 h-[80px]">
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
"""

target = """                                        ))}
                                    </div>

                                    {/* Rodapé da Página */}"""

if target in text:
    text = text.replace(target, "                                        ))}\n" + podium_section + "\n                                    </div>\n\n                                    {/* Rodapé da Página */}")
    with open("src/app/chaveamento/page.tsx", "w", encoding="utf-8") as f:
        f.write(text)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
