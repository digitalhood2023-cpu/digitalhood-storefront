import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  MapPin, 
  Phone, 
  Mail,
  CreditCard,
  Smartphone
} from 'lucide-react';

const quickLinks = [
  { name: 'Home', href: '/' },
  { name: 'Shop', href: '/shop' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Blog', href: '/blog' },
];

const supportLinks = [
  { name: 'FAQs', href: '/faqs' },
  { name: 'Shipping Info', href: '/shipping' },
  { name: 'Returns & Refunds', href: '/returns' },
  { name: 'Track Order', href: '/track-order' },
  { name: 'Warranty Policy', href: '/warranty' },
];

const legalLinks = [
  { name: 'Terms & Conditions', href: '/terms' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Cookie Policy', href: '/cookies' },
];

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
];



export default function Footer() {
  return (
    <footer className="bg-dh-primary text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-dh-secondary rounded-lg flex items-center justify-center">
                <span className="text-dh-black font-bold text-xl">D</span>
              </div>
              <div>
                <span className="font-display font-bold text-xl">Digital</span>
                <span className="font-display font-bold text-xl text-dh-secondary">Hood</span>
              </div>
            </Link>
            <p className="text-white/70 text-sm mb-6 max-w-xs">
              Zambia's premier digital marketplace for smartphones, accessories, and tech gadgets.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <MapPin className="w-4 h-4 text-dh-secondary" />
                <span>Lusaka, Zambia</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Phone className="w-4 h-4 text-dh-secondary" />
                <span>+260 97X XXX XXX</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Mail className="w-4 h-4 text-dh-secondary" />
                <span>support@digitalhood.zm</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-dh-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-dh-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-dh-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Payment */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-6">Follow Us</h4>
            <div className="flex gap-3 mb-8">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-dh-secondary hover:text-dh-black transition-all"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <h4 className="font-display font-semibold text-lg mb-4">We Accept</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <CreditCard className="w-4 h-4 text-dh-secondary" />
                <span className="text-xs">Cards</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Smartphone className="w-4 h-4 text-dh-secondary" />
                <span className="text-xs">Mobile Money</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm text-center md:text-left">
              © {new Date().getFullYear()} DigitalHood. All rights reserved. Made with ❤️ in Zambia.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-white/60 hover:text-dh-secondary text-sm transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-white/60 hover:text-dh-secondary text-sm transition-colors">
                Privacy
              </Link>
              <Link to="/sitemap" className="text-white/60 hover:text-dh-secondary text-sm transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
