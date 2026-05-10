import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin, Clock, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-6 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-black transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-black">Contact Us</span>
          </nav>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white py-12 lg:py-16 mb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-black mb-4">
                Contact DigitalHood Zambia
              </h1>
              <p className="text-lg text-gray-600">
                Have a question? We're here to help. Reach out to us via phone, email, or visit our store in Lusaka.
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="font-display font-bold text-xl text-black mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-[#ffb54a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">Phone</h3>
                      <a href="tel:+260971047570" className="text-gray-600 hover:text-black transition-colors">
                        +260 971 047 570
                      </a>
                      <p className="text-gray-500 text-sm mt-1">Mon-Sat, 8am-6pm</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-[#ffb54a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">Email</h3>
                      <a href="mailto:Contact@digitalhood.info" className="text-gray-600 hover:text-black transition-colors">
                        Contact@digitalhood.info
                      </a>
                      <p className="text-gray-500 text-sm mt-1">We reply within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-[#ffb54a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">Location</h3>
                      <p className="text-gray-600">Lusaka, Zambia</p>
                      <p className="text-gray-500 text-sm mt-1">Visit our store</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-[#ffb54a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">Business Hours</h3>
                      <p className="text-gray-600">Monday - Saturday</p>
                      <p className="text-gray-500 text-sm">8:00 AM - 6:00 PM</p>
                      <p className="text-gray-500 text-sm">Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-black rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link to="/shop" className="block text-gray-400 hover:text-[#ffb54a] transition-colors">
                    Shop Products
                  </Link>
                  <Link to="/track-order" className="block text-gray-400 hover:text-[#ffb54a] transition-colors">
                    Track Your Order
                  </Link>
                  <Link to="/shipping" className="block text-gray-400 hover:text-[#ffb54a] transition-colors">
                    Shipping Information
                  </Link>
                  <Link to="/returns" className="block text-gray-400 hover:text-[#ffb54a] transition-colors">
                    Returns & Refunds
                  </Link>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl p-6 lg:p-8">
                <h2 className="font-display font-bold text-xl text-black mb-6">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+260 97X XXX XXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="mt-1 min-h-[150px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitted}
                    className={`w-full sm:w-auto transition-all ${
                      isSubmitted
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                    } text-white px-8`}
                  >
                    {isSubmitted ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Message Sent!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
