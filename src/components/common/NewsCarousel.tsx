"use client";

import Image from "next/image";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  published_at: string | null;
}

export function NewsCarousel({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <p className="text-gray-500 text-center py-8">No hay noticias disponibles</p>;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {news.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            {item.image && (
              <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 overflow-hidden relative">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
            {item.excerpt && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.excerpt}</p>
            )}
            {item.published_at && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(item.published_at).toLocaleDateString("es-ES")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}