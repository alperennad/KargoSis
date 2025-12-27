import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image with Blur */}
        <div className="absolute inset-0">
          <img 
            src="/hero-bg.webp" 
            alt="" 
            className="w-full h-full object-cover blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-dark-900/80" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-700/10" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-secondary-600/20 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full text-primary-400 text-sm mb-8 animate-slide-up">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              Kocaeli Üniversitesi Kargo Sistemi
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold text-dark-50 mb-6">
              Akıllı{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
                Kargo Yönetimi
              </span>
            </h1>
            
            <p className="text-xl text-dark-300 mb-10 max-w-2xl mx-auto">
              Kocaeli'nin 12 ilçesinden üniversite kampüsüne optimum rota planlaması, 
              gerçek zamanlı takip ve maliyet analizi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg">
                Hemen Başla
              </Link>
              <Link to="/track" className="btn-outline text-lg">
                Kargo Takip
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '12', label: 'İlçe İstasyonu' },
              { value: '3+', label: 'Aktif Araç' },
              { value: '2250', label: 'kg Kapasite' },
              { value: '7/24', label: 'Takip' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-4xl md:text-5xl font-bold text-primary-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-dark-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Districts Section */}
      <section className="py-24 bg-dark-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-dark-50 mb-4">
              Hizmet Verdiğimiz İlçeler
            </h2>
            <p className="text-dark-400">Kocaeli'nin tüm ilçelerinden kargo topluyoruz</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze',
              'Gölcük', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez', 'İzmit'
            ].map((district) => (
              <span
                key={district}
                className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 hover:border-primary-500 hover:text-primary-400 transition-colors cursor-default"
              >
                {district}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card-elevated text-center">
            <h2 className="font-display text-3xl font-bold text-dark-50 mb-4">
              Hemen Kargo Göndermeye Başlayın
            </h2>
            <p className="text-dark-300 mb-8">
              Hesabınızı oluşturun ve dakikalar içinde ilk kargonuzu gönderin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary">
                Ücretsiz Kayıt Ol
              </Link>
              <Link to="/login" className="btn-secondary">
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

