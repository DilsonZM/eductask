"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  published_at: string | null;
}

export function NewsCarousel({ news }: { news: NewsItem[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (news.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % news.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [news.length]);

  if (news.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay noticias disponibles</p>;
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {news.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-full px-1"
          >
            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
              {item.image && (
                <div className="w-full h-40 bg-slate-100 rounded-xl mb-3 overflow-hidden relative">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h4 className="font-semibold text-slate-900 line-clamp-2 font-serif text-base">{item.title}</h4>
              {item.excerpt && (
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.excerpt}</p>
              )}
              {item.published_at && (
                <p className="text-xs text-slate-400 mt-3 uppercase tracking-[0.15em]">
                  {new Date(item.published_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {news.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {news.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-primary-500 w-4" : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
