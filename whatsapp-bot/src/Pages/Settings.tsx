import React, { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const Settings = () => {
  const [settings, setSettings] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    about: 'Hey there! I am using WhatsApp',
    notifications: true,
    language: 'en',
    profilePicture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAACUCAMAAAANv/M2AAAAM1BMVEXk5ueutLenrrHg4uTn6eqqsLSxt7rKztDq7O3Hy83X2tvQ09XT1tjBxsi5vsHd4OGjqa6G6AVlAAAEW0lEQVR4nO2c6XKzOgyGbSMveOX+r/Yz5CRNcih4w3JneP6k05lM32qEZGuBkJubm5ubm5ubm5ubm5u/BKxgi0hlVToFbeUcMXpaf4Wt6QSAYGdHGWN8JX4IL+00ss0VMU5QTj/h1Ds7qrlBSUF3if+GMGpA2UAM+7bxO4yb4awN1h9J3mR7PZRqIPOJ4s1LhMQW+gZMPkHzih/G1qDPPOPH2GzCVvsflqVqXmXbIYxtku38YADVYDM1U4oeREDn+MaDZcJVDVO2nSMCWXVqrPvEYUqGucTQMYQgZhmwRZIjLOA5yC+nugS8QpIMssw5NlMbJFOr/Gj3g0DS7Co0UzqjmDpUaaY+IGguDXdP4k0GgbK88iPa95dcHqOfMAT/qPSOaGqER7E8sbzonmBCTZB+sPTWXJMNn3DZ2T9UZezY6H0AqUrhT0RnS0MT0Z2DXnqp44i+V1wwLTTTvudTlVK7O6dv+Kg8lj7pmxObRLx4K79F36Jv0TWi/2T0qL4CbPSN05BbSd+nc8WmwR2Adi+vw9JAs+jcNfqT5+k/eXPJ7mntwG1nzSTUi+5+GyfktIF/iuhfWK+vMPWuIKwNxFpD896SV2qrphh9OZCVlsbpkdeVID3KEIWqK+chtbegRjRSdyueT8sPIAxvfqI4wXC0ji2BUPwsYkkmFWEPpR33osxBUOc9CuvUWJHjxVQgGnvwihCd+zD2rv/vknncE+gTbhsh52bOEQeBPkn3kN4X8N8B4hIjH3Ks+8L+bxVgxzNE9+v3MRD8WcRmCAMeZyh9mB2FD2hnpANAGS92dXMunB511wWINp5/uwnjXobhNi/eiNKCdXRh2/oIY8sinJnG34SK3q1UlG6MsSH+PL7elW0/DtQKjL8rB6tZ1w05Y+S2JCelNNbqMMGQBl8NG53Zi8gzZPxEOyG8k3ogV9n2D7V0bGH8KE5zvjAx2+nxDVzJ5LF/eKj3TXkMf85ozP1EgCB39g/PhHPhZ0tQ0iMoIkVFNc+F3h4e/5z2h+uH5zA6Tx2TTnRkeXqmS4BTpzttvABot38uKpHtu+yDqqnNAMILb69+JoG08ItPGNdXWhvCnBiQ8+DOXhW5Qcn63uFvuGuMDbXtrGPEBa4NIJs78yfMty7jwNT+AfyGU91W8/FNu5nquaFm1WaGN4F2e+XgLneNJ632ymHqp3mlSSV46uHO77TomV8anffgujZiwyV5+5il1kN6+8aDOg9pfAxNRVSkmdo9yQrV5Zorpgwq4aW9GWgzBFsGKx2t7h7sPigKIdBm/6YUXjLjVD93V6u65MiHE6HfVWf30Ave6tKc7FlUha85ezircuauEbnBusGCdQOyziCNdiSryev/Ix2UvskZaIHsEZ+LyIrVQzyGNPPNFOiJ5UlOgsHW+iJjbyDrXXLXkpwVIXUiqQNLqmg1SOxYSX7dimqxAdeI9FWpcVyacpfoHwXv7buO1JF2s7BxSD3pTUOxI/AfhLE8pc2fnt0AAAAASUVORK5CYII=',
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.name);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Save settings to the backend
    console.log('Settings saved:', settings);
    alert('Settings saved successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNameEdit = () => {
    if (isEditingName) {
      setSettings({ ...settings, name: tempName });
    }
    setIsEditingName(!isEditingName);
  };

  return (
    <div className={`min-h-screen text-gray-900'}`}>
      {/* Header */}
      <div className={`p-3 bg-gray-900 text-white`}>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-black/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-6">
        <div className={`p-4 rounded-lg border bg-white shadow-sm border-gray-200`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <img 
                src={settings.profilePicture} 
                alt="Profile" 
                className="w-16 h-16 rounded-full object-cover"
              />
              <button className="absolute bottom-0 right-0 bg-indigo-500 text-white p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 border-b border-gray-300 focus:outline-none focus:border-indigo-500 bg-transparent"
                  />
                </div>
              ) : (
                <h2 className="text-lg font-semibold">{settings.name}</h2>
              )}
              <p className="text-sm text-gray-500">{settings.about}</p>
            </div>
            <button 
              onClick={handleNameEdit}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {isEditingName ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              )}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium">+91 xxxxx xxxxx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className={`p-4 rounded-lg  border border-gray-200 shadow-lg space-y-4`}>
          <h2 className="font-semibold text-lg">Account</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-gray-200 focus:ring-gray-200 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
            <textarea
              name="about"
              value={settings.about}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-gray-200 focus:ring-gray-200 sm:text-sm"
            />
          </div>
        </div>

        

        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
              Logout
          </button>
        </div>
       
      </form>
    </div>
  );
};

export default Settings;