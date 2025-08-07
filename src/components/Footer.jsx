const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="text-center space-y-4">
          {/* Innovation Quote */}
          <div className="space-y-2">
            <p className="text-lg md:text-xl font-light italic text-purple-100">
              "Where Innovation Meets Excellence"
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto opacity-60"></div>
          </div>

          {/* Creator Credit */}
          <div className="text-sm md:text-base text-purple-100">
            Crafted with passion by{' '}
            <a 
              href="#" 
              className="font-semibold text-white hover:text-purple-200 transition-colors duration-200 hover:underline decoration-2 underline-offset-2"
            >
              Arjun PS
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs md:text-sm text-purple-200/80 font-light">
            © 2025 All rights reserved
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;