'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/features/products/types';
import FeaturedRail from './FeaturedRail';

interface Slide {
  /** Alttaki sekmede görünen kısa ad */
  tab: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  imageUrl: string;
  /** Görselin kadrajı (odak noktası) */
  focus?: string;
}

// Kampanya içerikleri; görseller public/hero altında (Unsplash lisansı), bağlantılar katalog aramalarına yönlenir
const SLIDES: Slide[] = [
  {
    tab: 'Steam & PC',
    eyebrow: 'Steam cüzdan kodları ve oyun anahtarları',
    title: 'Oyun kütüphanen için güvenli alışveriş',
    subtitle: 'Kodu kontrol edip onaylayana kadar ödemen satıcıya geçmez. Sorun çıkarsa itiraz aç, hakem ekibimiz devreye girsin.',
    cta: { label: 'Steam ilanlarına göz at', href: '/katalog?search=steam' },
    imageUrl: '/hero/pc-oyun.jpg',
  },
  {
    tab: 'Valorant & LoL',
    eyebrow: 'Oyun içi para birimleri',
    title: 'VP, RP ve oyun içi paketler tek yerde',
    subtitle: 'Satıcı puanlarını ve yorumları gör, bütçene uyan paketi seç. Teslim edilmeyen siparişin tutarı cüzdanına geri döner.',
    cta: { label: 'Paketleri karşılaştır', href: '/katalog?search=valorant' },
    imageUrl: '/hero/oyun-ici.jpg',
    focus: 'object-[center_35%]',
  },
  {
    tab: 'Mobil oyunlar',
    eyebrow: 'PUBG Mobile UC, Brawl Stars ve dahası',
    title: 'Mobil oyunlar için anında teslim',
    subtitle: 'Stok ve teslim süresi her ilanda açıkça yazar. Anında teslimatlı ilanlarda kod, ödemeden hemen sonra hesabında.',
    cta: { label: 'Mobil ilanları gör', href: '/katalog?cat=mobil-oyunlar' },
    imageUrl: '/hero/mobil.jpg',
  },
];

const INTERVAL_MS = 7000;
const SWIPE_THRESHOLD = 50;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Kampanya slaytları: sekmeli gezinme, ilerleme çubuğu, kaydırma ve klavye desteği */
function Carousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const touchStart = useRef<number | null>(null);
  const autoplay = !paused && !reducedMotion;

  const go = useCallback((index: number) => setCurrent((index + SLIDES.length) % SLIDES.length), []);

  // Sekme görünür değilken geçiş durur
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => go(current + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [autoplay, current, go]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Öne çıkan kampanyalar"
      className="relative h-full min-h-[380px] sm:min-h-[420px] rounded-2xl overflow-hidden bg-[#0d0f15] border border-[#1c1f2b] flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(current + 1);
        if (e.key === 'ArrowLeft') go(current - 1);
      }}
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(current + (dx < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <div className="relative flex-1">
        {SLIDES.map((slide, index) => {
          const active = index === current;
          const Heading = index === 0 ? 'h1' : 'h2';
          return (
            <div
              key={slide.tab}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${SLIDES.length}: ${slide.tab}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <img
                src={slide.imageUrl}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 w-full h-full object-cover ${slide.focus ?? 'object-center'}`}
              />
              {/* Metnin okunması için tek, yumuşak karartma */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f15] via-[#0d0f15]/80 to-[#0d0f15]/10" />

              <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 lg:px-12 py-10 max-w-xl">
                <p className="text-xs font-semibold text-[#7dd3fc]">{slide.eyebrow}</p>
                <Heading className="font-display font-bold text-3xl sm:text-4xl text-white leading-tight mt-3 text-balance">{slide.title}</Heading>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed">{slide.subtitle}</p>
                <div className="mt-7 flex flex-wrap items-center gap-5">
                  <Link
                    href={slide.cta.href}
                    tabIndex={active ? 0 : -1}
                    className="px-5 py-3 rounded-lg bg-white text-[#0d0f15] text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    {slide.cta.label}
                  </Link>
                  <Link href="/katalog" tabIndex={active ? 0 : -1} className="text-sm font-semibold text-slate-300 hover:text-white underline-offset-4 hover:underline">
                    Tüm katalog
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Başlıklı sekmeler; etkin sekmede otomatik geçişin ilerlemesi gösterilir */}
      <div role="tablist" aria-label="Kampanya seç" className="relative z-10 grid grid-cols-3 border-t border-white/10 bg-[#0d0f15]/85 backdrop-blur">
        {SLIDES.map((slide, index) => {
          const active = index === current;
          return (
            <button
              key={slide.tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => go(index)}
              className={`relative px-3 sm:px-5 py-3.5 text-left text-xs sm:text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="absolute top-0 inset-x-0 h-0.5 bg-white/10">
                {active && (
                  <span
                    key={`${current}-${autoplay}`}
                    className="block h-full bg-[#7dd3fc] origin-left"
                    style={autoplay ? { animation: `hero-progress ${INTERVAL_MS}ms linear forwards` } : { transform: 'scaleX(1)' }}
                  />
                )}
              </span>
              {slide.tab}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function HeroSlider({ featured }: { featured: Product[] }) {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Carousel />
        </div>
        <div className="lg:col-span-4">
          <FeaturedRail products={featured} />
        </div>
      </div>
    </section>
  );
}
