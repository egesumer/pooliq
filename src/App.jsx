import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

function App() {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    isLoading,
    user,
    getIdTokenClaims,
  } = useAuth0();

  const [nickname, setNickname] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [uploadedImages, setUploadedImages] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Pool management modal state
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [poolSettings, setPoolSettings] = useState({
    poolType: '',
    poolSize: '',
    location: ''
  });
  const [poolErrors, setPoolErrors] = useState({});
  const [showPoolSuccessMessage, setShowPoolSuccessMessage] = useState(false);
  const [isPoolSaving, setIsPoolSaving] = useState(false);
  const [initialPoolSettings, setInitialPoolSettings] = useState(null);

  // Profile management modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    nickname: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [showProfileSuccessMessage, setShowProfileSuccessMessage] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Pool options
  const poolOptions = {
    poolType: [
      { value: 'lap', label: 'Lap' },
      { value: 'recreational', label: 'Recreational' },
      { value: 'infinity', label: 'Infinity' },
      { value: 'kids', label: 'Kids' },
      { value: 'spa', label: 'Spa/Hot Tub' }
    ],
    poolSize: [
      { value: 'small', label: 'Small (≤10m)' },
      { value: 'medium', label: 'Medium (10–20m)' },
      { value: 'large', label: 'Large (20–30m)' },
      { value: 'custom', label: 'Custom' }
    ],
    location: [
      { value: 'indoor', label: 'Indoor' },
      { value: 'outdoor', label: 'Outdoor' },
      { value: 'rooftop', label: 'Rooftop' },
      { value: 'backyard', label: 'Backyard' }
    ]
  };

  // Check if current combination is valid
  const isCurrentCombinationValid = () => {
    if (!poolSettings.poolType || !poolSettings.poolSize || !poolSettings.location) {
      return false;
    }

    // Check for invalid combinations
    if (poolSettings.location === 'rooftop' && poolSettings.poolSize === 'large') {
      return false;
    }

    if (poolSettings.location === 'indoor' && poolSettings.poolSize === 'large') {
      return false;
    }

    return true;
  };

  // Validation rules for invalid combinations
  const validatePoolSettings = () => {
    const errors = {};
    
    if (!poolSettings.poolType) {
      errors.poolType = 'Pool type is required';
    }
    if (!poolSettings.poolSize) {
      errors.poolSize = 'Pool size is required';
    }
    if (!poolSettings.location) {
      errors.location = 'Location is required';
    }

    // Check for invalid combinations
    if (poolSettings.location === 'rooftop' && poolSettings.poolSize === 'large') {
      errors.location = 'Rooftop pools cannot be large size';
      errors.poolSize = 'Large pools cannot be on rooftops';
    }

    if (poolSettings.location === 'indoor' && poolSettings.poolSize === 'large') {
      errors.poolSize = 'Large pools are not recommended for indoor locations';
    }

    setPoolErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle pool setting changes
  const handlePoolSettingChange = (field, value) => {
    setPoolSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors for this field
    if (poolErrors[field]) {
      setPoolErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Real-time validation for combinations
    setTimeout(() => {
      const currentSettings = { ...poolSettings, [field]: value };
      
      // Check for invalid combinations
      if (currentSettings.location === 'rooftop' && currentSettings.poolSize === 'large') {
        setPoolErrors(prev => ({
          ...prev,
          location: 'Rooftop pools cannot be large size',
          poolSize: 'Large pools cannot be on rooftops'
        }));
      } else if (currentSettings.location === 'indoor' && currentSettings.poolSize === 'large') {
        setPoolErrors(prev => ({
          ...prev,
          poolSize: 'Large pools are not recommended for indoor locations'
        }));
      } else {
        // Clear combination errors if they exist
        setPoolErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.location && newErrors.location.includes('cannot be large size')) {
            delete newErrors.location;
          }
          if (newErrors.poolSize && newErrors.poolSize.includes('cannot be on rooftops')) {
            delete newErrors.poolSize;
          }
          if (newErrors.poolSize && newErrors.poolSize.includes('not recommended for indoor')) {
            delete newErrors.poolSize;
          }
          return newErrors;
        });
      }
    }, 100);
  };

  // Save pool settings
  const handleSavePoolSettings = async () => {
    if (validatePoolSettings()) {
      setIsPoolSaving(true);
      
      try {
        // Extract user sub for the request
        const sub = user?.sub;
        if (!sub) {
          throw new Error('User sub not available');
        }

        const response = await fetch('https://egesumerclash.app.n8n.cloud/webhook/update-pool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sub,
            poolType: poolSettings.poolType,
            poolSize: poolSettings.poolSize,
            location: poolSettings.location
          })
        });

        const data = await response.json();
        console.log('Pool settings API response:', data);
        
        // Ensure current settings are saved to localStorage
        localStorage.setItem('poolSettings', JSON.stringify(poolSettings));
        
        // Update initialPoolSettings to reflect the latest saved settings
        setInitialPoolSettings({
          poolType: poolSettings.poolType,
          poolSize: poolSettings.poolSize,
          location: poolSettings.location
        });
        
        // Close modal and show success message
        setShowPoolModal(false);
        setShowPoolSuccessMessage(true);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowPoolSuccessMessage(false);
        }, 5000);
        
      } catch (error) {
        console.error('Error saving pool settings:', error);
      } finally {
        setIsPoolSaving(false);
      }
    }
  };

  // Profile validation
  const validateProfileSettings = () => {
    const errors = {};
    
    if (!profileData.nickname || profileData.nickname.trim() === '') {
      errors.nickname = 'Nickname is required';
    } else if (profileData.nickname.length < 2) {
      errors.nickname = 'Nickname must be at least 2 characters long';
    } else if (profileData.nickname.length > 50) {
      errors.nickname = 'Nickname must be less than 50 characters';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile settings
  const handleSaveProfileSettings = async () => {
    if (validateProfileSettings()) {
      setIsProfileSaving(true);
      
      try {
        // Extract user sub for the request
        const sub = user?.sub;
        if (!sub) {
          throw new Error('User sub not available');
        }

        const response = await fetch('https://egesumerclash.app.n8n.cloud/webhook/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sub,
            nickname: profileData.nickname.trim()
          })
        });

        const data = await response.json();
        console.log('Profile settings API response:', data);
        
        // Update local nickname state
        setNickname(profileData.nickname.trim());
        
        // Close modal and show success message
        setShowProfileModal(false);
        setShowProfileSuccessMessage(true);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowProfileSuccessMessage(false);
        }, 5000);
        
      } catch (error) {
        console.error('Error saving profile settings:', error);
      } finally {
        setIsProfileSaving(false);
      }
    }
  };

  // Close modal on escape key and handle Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (showPoolModal || showProfileModal)) {
        if (showPoolModal) setShowPoolModal(false);
        if (showProfileModal) setShowProfileModal(false);
      }
      if (e.key === 'Enter' && showPoolModal && isCurrentCombinationValid()) {
        handleSavePoolSettings().catch(console.error);
      }
      if (e.key === 'Enter' && showProfileModal && profileData.nickname && profileData.nickname.trim() && !profileErrors.nickname) {
        handleSaveProfileSettings().catch(console.error);
      }
    };

    if (showPoolModal || showProfileModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus the first select element when pool modal opens
      if (showPoolModal) {
        setTimeout(() => {
          const firstSelect = document.getElementById('pool-type-select');
          if (firstSelect) {
            firstSelect.focus();
          }
        }, 100);
      }
      
      // Focus the nickname input when profile modal opens
      if (showProfileModal) {
        setTimeout(() => {
          const nicknameInput = document.getElementById('profile-nickname-input');
          if (nicknameInput) {
            nicknameInput.focus();
          }
        }, 100);
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showPoolModal, showProfileModal]);

  // Load saved pool settings on modal open
  useEffect(() => {
    if (showPoolModal) {
      // First try to use pre-fetched initial pool settings
      if (initialPoolSettings) {
        // Helper function to find matching value in options
        const findMatchingValue = (apiValue, options) => {
          if (!apiValue) return '';
          const normalizedApiValue = apiValue.toString().toLowerCase().trim();
          
          // Try exact match first
          const exactMatch = options.find(option => 
            option.value.toLowerCase() === normalizedApiValue
          );
          if (exactMatch) return exactMatch.value;
          
          // Try partial match
          const partialMatch = options.find(option => 
            option.value.toLowerCase().includes(normalizedApiValue) ||
            normalizedApiValue.includes(option.value.toLowerCase())
          );
          if (partialMatch) return partialMatch.value;
          
          // Try label match
          const labelMatch = options.find(option => 
            option.label.toLowerCase().includes(normalizedApiValue) ||
            normalizedApiValue.includes(option.value.toLowerCase())
          );
          if (labelMatch) return labelMatch.value;
          
          return '';
        };
        
        // Map initial pool settings to our format
        const mappedSettings = {
          poolType: findMatchingValue(initialPoolSettings.poolType, poolOptions.poolType),
          poolSize: findMatchingValue(initialPoolSettings.poolSize, poolOptions.poolSize),
          location: findMatchingValue(initialPoolSettings.location, poolOptions.location)
        };
        
        // Only update if we have valid data
        if (mappedSettings.poolType || mappedSettings.poolSize || mappedSettings.location) {
          setPoolSettings(mappedSettings);
          // Save to localStorage for future use
          localStorage.setItem('poolSettings', JSON.stringify(mappedSettings));
          return; // Exit early if initial data is available
        }
      }
      
      // Fallback to localStorage if no initial data
      const savedSettings = localStorage.getItem('poolSettings');
      if (savedSettings) {
        try {
          setPoolSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error('Error loading pool settings from localStorage:', e);
        }
      }
    }
  }, [showPoolModal, initialPoolSettings]);

  // Save to localStorage when settings change
  useEffect(() => {
    if (Object.values(poolSettings).some(value => value !== '')) {
      localStorage.setItem('poolSettings', JSON.stringify(poolSettings));
    }
  }, [poolSettings]);

  // Load profile data on modal open
  useEffect(() => {
    if (showProfileModal) {
      // Load current nickname into profile data
      setProfileData({ nickname: nickname || '' });
    }
  }, [showProfileModal, nickname]);

  // 👇 Tüm srcdoc'ları array olarak ayıklar
  const extractSrcdocArray = (html) => {
    // Eğer direkt text ise, direkt döndür
    if (!html.includes('<') && !html.includes('>')) {
      return [html];
    }
    
    // srcdoc içeren iframe'leri ara
    const matches = html.match(/srcdoc="([^"]*)"/g);
    if (!matches) {
      return [html];
    }

    const result = matches.map((m) =>
      m
        .replace(/^srcdoc="/, '')
        .replace(/"$/, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
    );
    
    return result;
  };



  // Mesajlar değiştiğinde otomatik scroll - iOS Safari için basit yaklaşım
  useEffect(() => {
    if (messages.length > 0) {
      // iOS Safari için basit ve güvenilir scroll
      const scrollToBottom = () => {
        const chatBox = document.querySelector('.chat-box');
        if (chatBox) {
          // iOS Safari için en basit yöntem
          chatBox.scrollTop = chatBox.scrollHeight;
          
          // iOS Safari'de bazen çalışmaz, force et
          requestAnimationFrame(() => {
            chatBox.scrollTop = chatBox.scrollHeight;
          });
        }
      };
      
      // Hemen scroll et
      scrollToBottom();
      
      // iOS Safari için delayed scroll
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 500);
    }
  }, [messages]);



  const formatName = (name) =>
    name
      ?.split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  // AI mesajlarını daha okunabilir hale getir
  const formatAssistantMessage = (text) => {
    if (!text) return text;
    
    try {
      // Bold metinleri düzgün formatla
      let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Paragrafları ayır
      formatted = formatted
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.trim()}</p>`)
        .join('');
      
      // Liste öğelerini daha temiz formatla
      formatted = formatted.replace(
        /(\d+\.\s*\*\*.*?\*\*:.*?)(?=\n\d+\.|$)/gs,
        (match) => {
          return match.replace(/^\d+\.\s*/, '<li>');
        }
      );
      
      // Ardışık li elementlerini ul içine al
      formatted = formatted.replace(
        /(<li>.*?<\/li>)+/gs,
        '<ul>$&</ul>'
      );
      
      return formatted;
    } catch (error) {
      console.error('❌ Format error:', error);
      return text; // Hata durumunda ham text'i döndür
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Token hazır değilse de isteği yapabilmek için opsiyonel al
        let token = null;
        try {
          const claims = await getIdTokenClaims();
          token = claims?.__raw;
        } catch (e) {
          console.warn('ℹ️ ID token henüz hazır değil, Authorization olmadan devam ediliyor');
        }

        const sub = user?.sub;
        if (!sub) {
          console.warn('⚠️ User sub bulunamadı, 3 saniye sonra tekrar deneniyor');
          setTimeout(() => setIsUserSynced(false), 3000);
          return;
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }


        
        const res = await fetch('https://egesumerclash.app.n8n.cloud/webhook/create-user', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sub })
          // mode: 'no-cors' kaldırıldı - response'u okuyabilmek için
        });


        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'No error text available');
          throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        

        
        // N8n'den gelen verileri kullan
        if (data.Nickname) {
          setNickname(formatName(data.Nickname));
                            
        } else {
          setNickname(formatName(user.name || 'Kullanıcı'));

        }
        
        if (data.agent_id) {
          setAgentId(data.agent_id);

        } else {
          setAgentId('Bilinmiyor');

        }

        // Store initial pool settings if available
        if (data.PoolType || data.PoolSize || data.Location) {
          const initialSettings = {
            poolType: data.PoolType || '',
            poolSize: data.PoolSize || '',
            location: data.Location || ''
          };
          setInitialPoolSettings(initialSettings);
          console.log('Initial pool settings stored:', initialSettings);
        }



        // Başarılı olduğu durumda senkronlandı olarak işaretle
        setIsUserSynced(true);
        console.log('✅ User data synced successfully');
      } catch (err) {
        console.error('❌ Kullanıcı verisi alınamadı:', err);
        setNickname(user?.name || 'Kullanıcı');

        // Hata durumunda loading'den çık, retry yapma
        setIsUserSynced(true);
        console.log('⚠️ User sync failed, but continuing to main app');
      }
    };

    if (isAuthenticated && user?.sub && !isUserSynced) {
      fetchUserData();
    }
  }, [isAuthenticated, user, isUserSynced, getIdTokenClaims]);

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
    e.target.value = null;
  };



  // Mesajları temizle
  const clearMessages = () => {
    setMessages([]);
    // Uploaded images'ları da temizle
    Object.values(uploadedImages).forEach(url => URL.revokeObjectURL(url));
    setUploadedImages({});
  };



  const sendImage = async () => {
    if (!file) return;

    const claims = await getIdTokenClaims();
    const token = claims?.__raw;
    
    if (!token) {
      console.error('❌ ID token not available for image upload');
      return;
    }
    
    // user.sub değerini direkt kullan, token decode etme
    const sub = user?.sub;
    if (!sub) {
      console.error('❌ User sub not available for image upload');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('sub', sub);

    const typingId = uuidv4();

    try {
      // Kullanıcı mesajı ve geçici "Yazıyor..." mesajı
      const userMessageId = uuidv4();
      const imageUrl = URL.createObjectURL(file);
      setUploadedImages(prev => ({ ...prev, [userMessageId]: imageUrl }));
      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', text: 'Image sent', imageId: userMessageId },
        { id: typingId, role: 'assistant', text: 'Typing...' },
      ]);
      setIsAssistantTyping(true);


      
      const res = await fetch('https://egesumerclash.app.n8n.cloud/webhook/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });



      if (!res.ok) throw new Error(`chat failed: ${res.status}`);

      const rawReply = await res.text();

      // Boş yanıt kontrolü
      if (!rawReply || rawReply.trim() === '') {
        throw new Error('AI did not respond');
      }

      const cleanedReplies = extractSrcdocArray(rawReply);





      setMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((msg) => msg.id === typingId);

        if (index === -1) {
          console.error('❌ Typing message not found:', typingId);
          return prev;
        }

        // İlk mesajı güncelle
        updated[index] = {
          ...updated[index],
          text: cleanedReplies[0],
        };

        // Diğerlerini sırayla ekle
        for (let i = 1; i < cleanedReplies.length; i++) {
          updated.push({
            id: uuidv4(),
            role: 'assistant',
            text: cleanedReplies[i],
          });
        }

        return updated;
      });

      // Mesajlar eklendikten sonra en alta scroll et - iOS Safari optimized
      setTimeout(() => {
        const chatBox = document.querySelector('.chat-box');
        if (chatBox) {
          // iOS Safari için smooth scroll
          chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
          });
          
          // iOS Safari'de bazen smooth scroll çalışmaz, fallback olarak direkt scroll
          setTimeout(() => {
            chatBox.scrollTop = chatBox.scrollHeight;
          }, 300);
        }
      }, 100);
    } catch (err) {
      console.error('❌ Image upload failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
      
      // Hata mesajını kullanıcıya göster
      setMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((msg) => msg.id === typingId);

        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            text: err.message.includes('AI is unable to analyze') 
              ? `🤔 ${err.message}` 
              : `❌ ${err.message}. Please try again.`,
          };
        } else {
          console.error('❌ Typing message not found for error:', typingId);
          // Eğer typing mesajı bulunamazsa, yeni bir hata mesajı ekle
          updated.push({
            id: uuidv4(),
            role: 'assistant',
            text: err.message.includes('AI is unable to analyze') 
              ? `🤔 ${err.message}` 
              : `❌ ${err.message}. Please try again.`,
          });
        }

        return updated;
      });
    } finally {
      setIsAssistantTyping(false);
      setFile(null);
    }
  };


  
  if (isLoading || (isAuthenticated && !isUserSynced)) {
    return (
      <div className="container" style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
                        minHeight: '90vh'
      }}>
           {/* Header Section - MyGardenPool üstte */}
           <div className="header-section" style={{ 
             marginBottom: '3rem',
             paddingBottom: '1.5rem',
             borderBottom: '2px solid rgba(16, 185, 129, 0.1)',
             display: 'flex',
             flexDirection: 'row',
             alignItems: 'center',
             justifyContent: 'center',
             gap: '1rem'
           }}>
             <div className="logo" style={{ 
               width: '60px', 
               height: '60px',
               boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
               border: '2px solid rgba(16, 185, 129, 0.1)'
             }}>
               <img src="/logo.png" alt="MyGardenPool Logo" />
             </div>
             <div className="company-name" style={{ 
               fontSize: '2.25rem',
               background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #3b82f6 100%)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               backgroundClip: 'text',
               textShadow: '0 2px 4px rgba(0,0,0,0.1)'
             }}>
               MyGardenPool
             </div>
           </div>

         {/* Pool IQ Logo - Ortada */}
         <div style={{ 
           marginBottom: '3rem',
           textAlign: 'center'
         }}>
           <img 
             src="/pooliq.png" 
             alt="Pool IQ Logo" 
             style={{ 
               maxWidth: '100%',
               width: 'min(400px, 80vw)',
               height: 'auto',
               maxHeight: '200px',
               borderRadius: '0',
               boxShadow: 'none',
               background: 'transparent',
             }} 
           />
         </div>

        {/* Loading Content */}
        <div style={{ 
          textAlign: 'center',
          maxWidth: '500px',
          padding: '3rem'
        }}>
          {/* Loading Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem auto',
            background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
            border: '3px solid rgba(255,255,255,0.3)',
            animation: 'spin 2s linear infinite',
            overflow: 'hidden'
          }}>
            <img 
              src="/logo.png" 
              alt="Pool IQ Logo" 
              style={{ 
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '50%',
                maxWidth: '100%',
                maxHeight: '100%'
              }} 
            />
          </div>

          {/* Main Message */}
          <h2 style={{
            background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '1rem',
            letterSpacing: '-0.025em'
          }}>
            Optimizing Your Experience
          </h2>

          {/* Subtitle */}
          <p style={{
            color: '#64748b',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            marginBottom: '2rem',
            fontWeight: '500'
          }}>
            Setting up your personalized Pool IQ environment...
          </p>

          {/* Progress Indicator */}
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(16, 185, 129, 0.2)',
            borderRadius: '2px',
            margin: '0 auto',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #10b981 0%, #0ea5e9 100%)',
              borderRadius: '2px',
              animation: 'progressBar 2s ease-in-out infinite',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
            }}></div>
          </div>

          {/* Status Text */}
          <p style={{
            color: '#94a3b8',
            fontSize: '0.9rem',
            marginTop: '1rem',
            fontStyle: 'italic'
          }}>
            Configuring smart water analysis settings
          </p>
          

        </div>
      </div>
    );
  }





  if (!isAuthenticated) {
    return (
      <div className="container" style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '90vh',
                        textAlign: 'center'
      }}>
           {/* Header Section - MyGardenPool üstte */}
           <div className="header-section" style={{ 
             marginBottom: '3rem',
             paddingBottom: '1.5rem',
             borderBottom: '2px solid rgba(16, 185, 129, 0.1)',
             display: 'flex',
             flexDirection: 'row',
             alignItems: 'center',
             justifyContent: 'center',
             gap: '1rem'
           }}>
             <div className="logo" style={{ 
               width: '60px', 
               height: '60px',
               boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
               border: '1px solid rgba(16, 185, 129, 0.1)'
             }}>
               <img src="/logo.png" alt="MyGardenPool Logo" />
             </div>
             <div className="company-name" style={{ 
               fontSize: '2.25rem',
               background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #3b82f6 100%)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               backgroundClip: 'text',
               textShadow: '0 2px 4px rgba(0,0,0,0.1)'
             }}>
               MyGardenPool
             </div>
           </div>

         {/* Pool IQ Logo - Ortada */}
         <div style={{ 
           marginBottom: '3rem',
           textAlign: 'center'
         }}>
           <img 
             src="/pooliq.png" 
             alt="Pool IQ Logo" 
             style={{ 
               maxWidth: '100%',
               width: 'min(400px, 80vw)',
               height: 'auto',
               maxHeight: '200px',
               borderRadius: '0',
               boxShadow: 'none',
               background: 'transparent'
             }} 
           />
         </div>

        {/* Main Content */}
        <div style={{ 
          maxWidth: '500px',
          padding: '2rem'
        }}>
                     {/* Pool IQ Branding - Sadece Yazı */}
           <div style={{ 
             textAlign: 'center',
             marginBottom: '2rem'
           }}>
             <h2 style={{ 
               background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #3b82f6 100%)',
               backgroundClip: 'text',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               margin: 0,
               fontSize: '2.5rem',
               fontWeight: '800',
               letterSpacing: '-0.025em',
               textShadow: '0 2px 4px rgba(0,0,0,0.1)'
             }}>
               Pool IQ
             </h2>
           </div>

          {/* Description */}
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#64748b', 
            marginBottom: '1rem',
            fontWeight: '500',
            lineHeight: '1.6'
          }}>
            Smart Pool Water Analysis with AI
          </p>
          
          <p style={{ 
            fontSize: '1rem', 
            color: '#94a3b8', 
            marginBottom: '3rem',
            fontStyle: 'italic'
          }}>
            Powered by Ideaim LLC
          </p>

          {/* Sign In Button */}
          <button 
            onClick={() => loginWithRedirect()}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              color: '#f9fafb',
              fontWeight: '700',
              padding: '1.25rem 3rem',
              borderRadius: '16px',
              fontSize: '1.1rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              letterSpacing: '0.025em',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.35)';
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
         <div className="container">
       {/* Header Section - MyGardenPool üstte */}
       <div className="header-section" style={{
         display: 'flex',
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'center',
         gap: '1rem',
         marginBottom: '2rem'
       }}>
         <div className="logo">
           <img src="/logo.png" alt="MyGardenPool Logo" />
         </div>
         <div className="company-name" style={{
           fontSize: '2.25rem',
           background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #3b82f6 100%)',
           WebkitBackgroundClip: 'text',
           WebkitTextFillColor: 'transparent',
           backgroundClip: 'text',
           textShadow: '0 2px 4px rgba(0,0,0,0.1)'
         }}>MyGardenPool</div>
       </div>

       {/* Pool IQ Logo - Ortada */}
       <div style={{ 
         marginBottom: '3rem',
         textAlign: 'center'
       }}>
         <img 
           src="/pooliq.png" 
           alt="Pool IQ Logo" 
           style={{ 
             maxWidth: '100%',
             width: 'min(400px, 80vw)',
             height: 'auto',
             maxHeight: '200px',
             borderRadius: '0',
             boxShadow: 'none',
             background: 'transparent'
           }} 
         />
       </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Welcome, {nickname}!</h2>
          <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
            Pool IQ - Smart Water Analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>

          <button 
            onClick={() => setShowPoolModal(true)}
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              color: '#f9fafb',
              fontWeight: '500',
              letterSpacing: '0.025em',
              fontSize: '0.9rem'
            }}
          >
            Manage Pool
          </button>
          <button 
            onClick={() => setShowProfileModal(true)}
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              color: '#f9fafb',
              fontWeight: '500',
              letterSpacing: '0.025em',
              fontSize: '0.9rem'
            }}
            data-testid="profile-button"
          >
            Profile
          </button>
          <button 
            onClick={() => logout({ returnTo: window.location.origin })}
            style={{ 
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(107, 114, 128, 0.2)',
              color: '#f9fafb',
              fontWeight: '500',
              letterSpacing: '0.025em',
              fontSize: '0.9rem'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '30px',
          right: '30px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.98) 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          zIndex: 1000,
          animation: 'slideInRight 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(20px)',
          maxWidth: '380px',
          transform: 'translateZ(0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* Success Icon */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white"/>
              </svg>
            </div>
            
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                fontSize: '1.125rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.025em'
              }}>
                Profile Updated Successfully!
              </div>
              <div style={{ 
                fontSize: '1rem', 
                opacity: '0.95',
                lineHeight: '1.5',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginBottom: '1rem'
              }}>
                Welcome to Pool IQ, <strong style={{ fontWeight: '600' }}>{user.name}</strong>
              </div>
              
              {/* Progress Bar */}
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                  borderRadius: '2px',
                  animation: 'progressBar 3s linear',
                  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pool Settings Success Message */}
      {showPoolSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '30px',
          right: '30px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.98) 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          zIndex: 1000,
          animation: 'slideInRight 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(20px)',
          maxWidth: '380px',
          transform: 'translateZ(0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* Success Icon */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white"/>
              </svg>
            </div>
            
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                fontSize: '1.125rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.025em'
              }}>
                Pool Settings Saved!
              </div>
              <div style={{ 
                fontSize: '1rem', 
                opacity: '0.95',
                lineHeight: '1.5',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginBottom: '1rem'
              }}>
                Your pool configuration has been updated successfully.
              </div>
              
              
              
              {/* Progress Bar */}
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                  borderRadius: '2px',
                  animation: 'progressBar 3s linear',
                  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Success Message */}
      {showProfileSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: showPoolSuccessMessage ? '120px' : '30px',
          right: '30px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.98) 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          zIndex: 1000,
          animation: 'slideInRight 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(20px)',
          maxWidth: '380px',
          transform: 'translateZ(0)'
        }} data-testid="profile-success-message">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            {/* Success Icon */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }} data-testid="profile-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white"/>
              </svg>
            </div>
            
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }} data-testid="profile-success-content">
              <div style={{ 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                fontSize: '1.125rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.025em'
              }} data-testid="profile-success-title">
                Profile Updated Successfully!
              </div>
              <div style={{ 
                fontSize: '1rem', 
                opacity: '0.95',
                lineHeight: '1.5',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginBottom: '1rem'
              }} data-testid="profile-success-description">
                Your profile has been updated successfully.
              </div>
              
              {/* Progress Bar */}
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }} data-testid="profile-success-progress">
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                  borderRadius: '2px',
                  animation: 'progressBar 3s linear',
                  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="chat-box">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p>No messages yet. Upload a photo to start chatting with Pool IQ!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role} ${msg.text === 'Typing...' ? 'typing' : ''}`}
            >
              <strong style={msg.role === 'assistant' ? {
                background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              } : {}}>
                {msg.role === 'user' ? 'You:' : 'Pool IQ:'}
              </strong>
              {msg.role === 'assistant' && msg.text !== 'Typing...' ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatAssistantMessage(msg.text) 
                  }} 
                />
              ) : msg.role === 'user' && msg.imageId ? (
                <div>
                  <img 
                    src={uploadedImages[msg.imageId]} 
                    alt="Uploaded image" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '200px', 
                      borderRadius: '8px',
                      marginTop: '8px',
                      border: '2px solid #e5e7eb'
                    }} 
                  />
                </div>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          ))
        )}
      </div>

             {/* Professional File Upload Section */}
       <div className="file-upload-section">
         <div className="file-upload-container">
           {/* File Selection Area */}
           <div className="file-selection-area">
             <label htmlFor="file-input" className="file-upload-label">
               <div className="file-upload-icon">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                 </svg>
               </div>
               <div className="file-upload-text">
                 <span className="file-upload-title">Choose a photo to analyze</span>
                 <span className="file-upload-subtitle">PNG, JPG, JPEG up to 10MB</span>
               </div>
             </label>
             <input
               type="file"
               id="file-input"
               accept="image/*"
               onChange={handleFileUpload}
               className="file-input-hidden"
             />
           </div>

           {/* File Preview */}
           {file && (
             <div className="file-preview">
               <div className="file-preview-content">
                 <div className="file-preview-icon">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
                   </svg>
                 </div>
                 <div className="file-preview-info">
                   <span className="file-preview-name">{file.name}</span>
                   <span className="file-preview-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                 </div>
                 <button 
                   className="file-remove-btn"
                   onClick={() => setFile(null)}
                   aria-label="Remove file"
                 >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                   </svg>
                 </button>
               </div>
             </div>
           )}

           {/* Action Buttons */}
           <div className="file-action-buttons">
             <button 
               onClick={sendImage} 
               disabled={!file || isAssistantTyping}
               className={`send-photo-btn ${!file || isAssistantTyping ? 'disabled' : ''}`}
             >
               {isAssistantTyping ? (
                 <>
                   <div className="loading-spinner"></div>
                   <span>Analyzing...</span>
                 </>
               ) : (
                 <>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                   </svg>
                   <span>Analyze Photo</span>
                 </>
               )}
             </button>
             
             <button 
               onClick={clearMessages}
               className="clear-messages-btn"
               disabled={messages.length === 0}
             >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM8 9H16V19H8V9ZM15.5 4L14.5 3H9.5L8.5 4H5V6H19V4H15.5Z" fill="currentColor"/>
               </svg>
               <span>Clear Chat</span>
             </button>
           </div>
         </div>
       </div>

                    {/* Pool Management Modal */}
       {showPoolModal && (
         <div 
           className="pool-modal-overlay"
           onClick={() => setShowPoolModal(false)}
           role="dialog"
           aria-modal="true"
           aria-labelledby="pool-modal-title"
         >
           <div 
             className="pool-modal-content"
             onClick={(e) => e.stopPropagation()}
             role="document"
           >
             {/* Close Button */}
             <button 
               className="pool-modal-close"
               onClick={() => setShowPoolModal(false)}
               aria-label="Close modal"
             >
               ×
             </button>

                         {/* Modal Title */}
             <h3 
               id="pool-modal-title"
               className="pool-modal-title"
             >
               Manage Your Pool
             </h3>

             

                         {/* Pool Type */}
             <div className="pool-form-group">
               <label 
                 htmlFor="pool-type-select"
                 className="pool-form-label"
               >
                 Pool Type
               </label>
               <select
                 id="pool-type-select"
                 value={poolSettings.poolType}
                 onChange={(e) => handlePoolSettingChange('poolType', e.target.value)}
                 aria-describedby={poolErrors.poolType ? 'pool-type-error' : undefined}
                 aria-invalid={!!poolErrors.poolType}
                 className={`pool-form-select ${poolErrors.poolType ? 'error' : ''}`}
               >
                 <option value="">Select a pool type</option>
                 {poolOptions.poolType.map(option => (
                   <option key={option.value} value={option.value}>
                     {option.label}
                   </option>
                 ))}
               </select>
               {poolErrors.poolType && (
                 <p 
                   id="pool-type-error"
                   className="pool-form-error"
                   role="alert"
                 >
                   {poolErrors.poolType}
                 </p>
               )}
             </div>

                         {/* Pool Size */}
             <div className="pool-form-group">
               <label 
                 htmlFor="pool-size-select"
                 className="pool-form-label"
               >
                 Pool Size
               </label>
               <select
                 id="pool-size-select"
                 value={poolSettings.poolSize}
                 onChange={(e) => handlePoolSettingChange('poolSize', e.target.value)}
                 aria-describedby={poolErrors.poolSize ? 'pool-size-error' : undefined}
                 aria-invalid={!!poolErrors.poolSize}
                 className={`pool-form-select ${poolErrors.poolSize ? 'error' : ''}`}
               >
                 <option value="">Select a pool size</option>
                 {poolOptions.poolSize.map(option => (
                   <option key={option.value} value={option.value}>
                     {option.label}
                   </option>
                 ))}
               </select>
               {poolErrors.poolSize && (
                 <p 
                   id="pool-size-error"
                   className="pool-form-error"
                   role="alert"
                 >
                   {poolErrors.poolSize}
                 </p>
               )}
             </div>

                         {/* Location */}
             <div className="pool-form-group">
               <label 
                 htmlFor="pool-location-select"
                 className="pool-form-label"
               >
                 Location
               </label>
               <select
                 id="pool-location-select"
                 value={poolSettings.location}
                 onChange={(e) => handlePoolSettingChange('location', e.target.value)}
                 aria-describedby={poolErrors.location ? 'pool-location-error' : undefined}
                 aria-invalid={!!poolErrors.location}
                 className={`pool-form-select ${poolErrors.location ? 'error' : ''}`}
               >
                 <option value="">Select a location</option>
                 {poolOptions.location.map(option => (
                   <option key={option.value} value={option.value}>
                     {option.label}
                   </option>
                 ))}
               </select>
               {poolErrors.location && (
                 <p 
                   id="pool-location-error"
                   className="pool-form-error"
                   role="alert"
                 >
                   {poolErrors.location}
                 </p>
               )}
             </div>

                         {/* Save Button */}
                          <button 
               onClick={handleSavePoolSettings}
               disabled={!isCurrentCombinationValid() || isPoolSaving}
               className="pool-save-button"
             >
               {isPoolSaving ? 'Saving...' : 'Save Settings'}
             </button>

             {/* Helper Text */}
             <div className="pool-helper-text">
               <p>
                 💡 <strong>Tip:</strong> Some combinations may not be recommended. For example, large pools are not suitable for rooftops.
               </p>
             </div>
             
             
           </div>
         </div>
       )}

                    {/* Profile Management Modal */}
       {showProfileModal && (
         <div 
           className="profile-modal-overlay"
           onClick={() => setShowProfileModal(false)}
           role="dialog"
           aria-modal="true"
           aria-labelledby="profile-modal-title"
           data-testid="profile-modal-overlay"
         >
           <div 
             className="profile-modal-content"
             onClick={(e) => e.stopPropagation()}
             role="document"
             data-testid="profile-modal-content"
           >
             {/* Close Button */}
             <button 
               className="profile-modal-close"
               onClick={() => setShowProfileModal(false)}
               aria-label="Close modal"
               data-testid="profile-modal-close"
               tabIndex={0}
             >
               ×
             </button>

                         {/* Modal Title */}
             <h3 
               id="profile-modal-title"
               className="profile-modal-title"
               data-testid="profile-modal-title"
             >
               Manage Your Profile
             </h3>

                         {/* Nickname */}
             <div className="profile-form-group" data-testid="profile-form-group">
               <label 
                 htmlFor="profile-nickname-input"
                 className="profile-form-label"
                 data-testid="profile-form-label"
               >
                 Nickname
               </label>
               <input
                 type="text"
                 id="profile-nickname-input"
                 value={profileData.nickname}
                 onChange={(e) => {
                   const value = e.target.value;
                   setProfileData(prev => ({ ...prev, nickname: value }));
                   
                   // Clear errors for this field
                   if (profileErrors.nickname) {
                     setProfileErrors(prev => ({
                       ...prev,
                       nickname: ''
                     }));
                   }
                   
                   // Real-time validation
                   setTimeout(() => {
                     if (!value || value.trim() === '') {
                       setProfileErrors(prev => ({
                         ...prev,
                         nickname: 'Nickname is required'
                       }));
                     } else if (value.length < 2) {
                       setProfileErrors(prev => ({
                         ...prev,
                         nickname: 'Nickname must be at least 2 characters long'
                       }));
                     } else if (value.length > 50) {
                       setProfileErrors(prev => ({
                         ...prev,
                         nickname: 'Nickname must be less than 50 characters'
                       }));
                     } else {
                       // Clear error if validation passes
                       setProfileErrors(prev => ({
                         ...prev,
                         nickname: ''
                       }));
                     }
                   }, 100);
                 }}
                 aria-describedby={profileErrors.nickname ? 'profile-nickname-input-error' : undefined}
                 aria-invalid={!!profileErrors.nickname}
                 aria-label="Nickname input field"
                 data-testid="profile-nickname-input"
                 className={`profile-form-input ${profileErrors.nickname ? 'error' : ''}`}
                 placeholder="Enter your preferred nickname (2-50 characters)"
                 maxLength={50}
                 minLength={2}
                 pattern="[a-zA-Z0-9\s\-_\.]{2,50}"
                 title="Nickname must be 2-50 characters long and can contain letters, numbers, spaces, hyphens, underscores, and dots"
                 required
                 name="nickname"
                 tabIndex={0}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && profileData.nickname && profileData.nickname.trim() && !profileErrors.nickname) {
                      e.preventDefault();
                      handleSaveProfileSettings().catch(console.error);
                    }
                  }}
                  onBlur={() => {
                    if (profileData.nickname && profileData.nickname.trim()) {
                      validateProfileSettings();
                    }
                  }}
                  onFocus={() => {
                    if (profileErrors.nickname) {
                      setProfileErrors(prev => ({
                        ...prev,
                        nickname: ''
                      }));
                    }
                  }}
                  onPaste={() => {
                    setTimeout(() => {
                      if (profileData.nickname && profileData.nickname.trim()) {
                        validateProfileSettings();
                      }
                    }, 100);
                  }}
                  onInput={() => {
                    if (profileData.nickname && profileData.nickname.trim()) {
                      validateProfileSettings();
                    }
                  }}
                  autoComplete="nickname"
                 spellCheck="false"
                 autoFocus={showProfileModal}
               />
               <div style={{ 
                 display: 'flex', 
                 justifyContent: 'space-between', 
                 alignItems: 'center',
                 marginTop: '0.5rem'
               }} data-testid="profile-character-counter">
                 <span style={{ 
                   fontSize: '0.875rem', 
                   color: profileData.nickname.length > 40 ? '#ef4444' : '#6b7280',
                   fontWeight: '500'
                 }}>
                   {profileData.nickname.length}/50 characters
                 </span>
                 {profileData.nickname.length > 40 && (
                   <span style={{ 
                     fontSize: '0.75rem', 
                     color: '#ef4444',
                     fontWeight: '500'
                   }}>
                     Almost at limit
                   </span>
                 )}
               </div>
               {profileErrors.nickname && (
                 <p 
                   id="profile-nickname-input-error"
                   className="profile-form-error"
                   role="alert"
                   data-testid="profile-error-message"
                 >
                   {profileErrors.nickname}
                 </p>
               )}
             </div>

                         {/* Save Button */}
                          <button 
               onClick={handleSaveProfileSettings}
               disabled={!profileData.nickname || profileData.nickname.trim() === '' || profileErrors.nickname || isProfileSaving}
               className="profile-save-button"
               data-testid="profile-save-button"
               tabIndex={0}
             >
               {isProfileSaving ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <div style={{
                     width: '16px',
                     height: '16px',
                     border: '2px solid rgba(255,255,255,0.3)',
                     borderTop: '2px solid white',
                     borderRadius: '50%',
                     animation: 'spin 1s linear infinite'
                   }}></div>
                   Saving...
                 </div>
               ) : 'Save Profile'}
             </button>

             {/* Helper Text */}
             <div className="profile-helper-text" data-testid="profile-helper-text">
               <p>
                  💡 <strong>Tip:</strong> Your nickname should be 2-50 characters long and will be displayed to other users. You can use letters, numbers, and common symbols.
                </p>
             </div>
             
             
           </div>
         </div>
       )}
    </div>
  );
}

export default App;
