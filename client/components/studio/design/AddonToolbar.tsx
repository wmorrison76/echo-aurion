import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AddonToolbarProps {
  onInsert: (language: string, code: string) => void;
}

const languages = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C#",
  "C",
  "C++",
  "Go",
  "Rust",
  "Kotlin",
  "Swift",
  "PHP",
  "Ruby",
  "SQL",
  "HTML/CSS",
] as const;

const snippets: Record<string, string> = {
  Python: "print('Hello, World!')\n",
  JavaScript: "export function hello(){ console.log('Hello, World!'); }\n",
  TypeScript:
    "export function hello(name: string): string { return `Hello, ${name}!`; }\n",
  Java: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World!"); } }\n',
  "C#": 'using System; class Program { static void Main() { Console.WriteLine("Hello, World!"); } }\n',
  C: '#include <stdio.h>\nint main(){ printf("Hello, World!\\n"); return 0; }\n',
  "C++":
    '#include <iostream>\nint main(){ std::cout << "Hello, World!\\n"; return 0; }\n',
  Go: 'package main\nimport "fmt"\nfunc main(){ fmt.Println("Hello, World!") }\n',
  Rust: 'fn main(){ println!("Hello, World!"); }\n',
  Kotlin: 'fun main(){ println("Hello, World!") }\n',
  Swift: 'import Foundation\nprint("Hello, World!")\n',
  PHP: "<?php echo 'Hello, World!'; ?>\n",
  Ruby: "puts 'Hello, World!'\n",
  SQL: "SELECT 'Hello, World!' AS greeting;\n",
  "HTML/CSS":
    '<!doctype html><html><head><meta charset=\"utf-8\"><style>body{font-family:sans-serif}</style></head><body><h1>Hello, World!</h1></body></html>\n',
  "JS: Anime.js":
    "import anime from 'animejs/lib/anime.es.js'\nexport function pulse(el){ anime({ targets: el, scale: [1, 1.15, 1], duration: 800, easing: 'easeInOutSine' }); }\n",
  "JS: GSAP":
    "import { gsap } from 'gsap'\nexport function fadeIn(el){ gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }); }\n",
  "JS: AOS":
    "import 'aos/dist/aos.css'\nimport AOS from 'aos'\nexport function initAOS(){ AOS.init({ duration: 600, once: true }); }\n// In JSX: <div data-aos='fade-up'>Hello</div>\n",
  "JS: ScrollReveal":
    "import ScrollReveal from 'scrollreveal'\nexport function initReveal(){ ScrollReveal().reveal('.reveal', { distance: '20px', duration: 600, easing: 'ease-out', origin: 'bottom' }); }\n// In JSX: <div className='reveal'>Item</div>\n",
  "JS: Fancybox":
    "import '@fancyapps/ui/dist/fancybox/fancybox.css'\nimport { Fancybox } from '@fancyapps/ui'\nexport function bindLightbox(){ Fancybox.bind('[data-fancybox]', { Thumbs: false }); }\n// In JSX: <a data-fancybox href='/image.jpg'>Open</a>\n",
  "JS: Chart.js":
    "import { Chart } from 'chart.js/auto'\nexport function renderChart(ctx){ new Chart(ctx, { type: 'line', data: { labels: ['A','B','C'], datasets: [{ label: 'Series', data: [3,7,4] }] } }); }\n",
  "JS: Three.js":
    "import * as THREE from 'three'\nexport function cube(canvas){ const r=new THREE.WebGLRenderer({canvas}); const sc=new THREE.Scene(); const cam=new THREE.PerspectiveCamera(70, canvas.clientWidth/canvas.clientHeight, 0.1, 100); cam.position.z=2; const geo=new THREE.BoxGeometry(); const mat=new THREE.MeshNormalMaterial(); const mesh=new THREE.Mesh(geo,mat); sc.add(mesh); function loop(){ mesh.rotation.x+=0.01; mesh.rotation.y+=0.01; r.setSize(canvas.clientWidth,canvas.clientHeight,false); r.render(sc,cam); requestAnimationFrame(loop);} loop(); }\n",
  "JS: Leaflet":
    "import 'leaflet/dist/leaflet.css'\nimport L from 'leaflet'\nexport function map(el){ const m=L.map(el).setView([51.505,-0.09],13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OpenStreetMap' }).addTo(m); L.marker([51.5,-0.09]).addTo(m); }\n",
  "JS: Swiper":
    "import 'swiper/css'\nimport { Swiper, SwiperSlide } from 'swiper/react'\n// In JSX:\n// <Swiper slidesPerView={1} loop><SwiperSlide>1</SwiperSlide><SwiperSlide>2</SwiperSlide></Swiper>\n",
  "JS: Cleave.js":
    "import Cleave from 'cleave.js'\nexport function formatInput(input){ new Cleave(input, { phone: true, phoneRegionCode: 'US' }); }\n",
  "JS: Video.js":
    "import 'video.js/dist/video-js.css'\nimport videojs from 'video.js'\nexport function player(el, src){ const p=videojs(el,{ controls:true, preload:'auto', sources:[{src}]}); return p; }\n",
  "JS: Plyr":
    "import 'plyr/dist/plyr.css'\nimport Plyr from 'plyr'\nexport function plyr(el,src){ const p=new Plyr(el); p.source={ type:'video', sources:[{src}]}; }\n",
  "JS: Howler":
    "import { Howl } from 'howler'\nexport function beep(){ const s=new Howl({ src:['/tone.mp3'] }); s.play(); }\n",
  "JS: LazyLoad":
    "import LazyLoad from 'vanilla-lazyload'\nexport function initLazy(){ new LazyLoad({ elements_selector: '.lazy' }); }\n",
  "JS: Headroom.js":
    "import Headroom from 'headroom.js'\nexport function headroom(el){ const h=new Headroom(el); h.init(); }\n",
};

export function AddonToolbar({ onInsert }: AddonToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            &lt;/Snippet&gt;
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-80 min-w-[240px] overflow-auto">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language}
              onClick={() => onInsert(language, snippets[language])}
            >
              {language}
            </DropdownMenuItem>
          ))}
          <div className="my-1 h-px bg-muted" />
          {Object.keys(snippets)
            .filter((key) => key.startsWith("JS: "))
            .map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onInsert("JavaScript", snippets[key])}
              >
                {key.replace("JS: ", "")}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default AddonToolbar;
