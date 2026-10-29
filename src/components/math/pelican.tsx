import artwork from '../../../site/www.yanghat.cn/assets/pelican.svg?raw';
import '../../../site/www.yanghat.cn/pelican.css';

/** Same repository SVG as the landing page; decorative and fixed in size. */
export function Pelican() {
  return <span className="pelican pelican-correct" aria-hidden="true" dangerouslySetInnerHTML={{ __html: artwork }} />;
}
