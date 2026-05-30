import {
  ChevronDown,
  ChevronUp,
  Crown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Bk1 =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop";
const Bk8 =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop";
const Bk11 =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop";
const Bk7 =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop";
const Animated = "https://media.giphy.com/media/3o7abB06u9bNzA8LC8/giphy.gif";

const radioStations = [
  {
    radioId: "Radio Maria 103.1 MHz",
    src: "https://dreamsiteradiocp2.com/proxy/rmmozambique2?mp=/stream",
    background: Bk1
  },
  {
    radioId: "RM ANTENA NACIONAL",
    src: "https://node.stream-africa.com:8443/AntenaNacional",
    background: Bk8
  },
  {
    radioId: "Radio Maria Papua New Guinea",
    src: "https://dreamsiteradiocp2.com/proxy/rmpapua2?mp=/stream",
    background: Bk1
  },
  {
    radioId: "Radio Miramar",
    src: "https://nl.digitalrm.pt:8150/stream",
    background: Animated
  },
  {
    radioId: "SUPER RM",
    src: "https://c1.mirror.africa:8443/227",
    background: Bk11
  },
  {
    radioId: "Cabo Delgado FM",
    src: "https://node.stream-africa.com:8443/CaboDelgadoFM",
    background: Bk8
  },
  {
    radioId: "Manica FM",
    src: "https://node.stream-africa.com:8443/ManicaFM",
    background: Bk8
  },
  {
    radioId: "Maputo Corridor FM",
    src: "https://node.stream-africa.com:8443/MaputoCorridor",
    background: Bk8
  },
  {
    radioId: "Radio Mocambique Maputo FM",
    src: "https://node.stream-africa.com:8443/MaputoFM",
    background: Bk8
  },
  {
    radioId: "Nampula FM",
    src: "https://node.stream-africa.com:8443/Nampula",
    background: Bk8
  },
  {
    radioId: "Niassa FM",
    src: "https://node.stream-africa.com:8443/NiassaFM",
    background: Bk8
  },
  {
    radioId: "Power FM Lusaka",
    src: "https://node.stream-africa.com:8443/PowerFMLusaka",
    background: Bk8
  },
  {
    radioId: "RM Desporto",
    src: "https://node.stream-africa.com:8443/RMDesporto",
    background: Bk8
  },
  {
    radioId: "Radio Cidade Beira",
    src: "https://node.stream-africa.com:8443/RadioCidadeBeira",
    background: Bk8
  },
  {
    radioId: "Radio Cidade Maputo",
    src: "https://node.stream-africa.com:8443/RadioCidadeMaputo",
    background: Bk8
  },
  {
    radioId: "Sofala FM",
    src: "https://node.stream-africa.com:8443/Sofala",
    background: Bk8
  },
  {
    radioId: "Zambezi FM",
    src: "https://node.stream-africa.com:8443/ZambeziFM",
    background: Bk8
  },
  {
    radioId: "Zambezia FM",
    src: "https://node.stream-africa.com:8443/ZambeziaFM",
    background: Bk8
  },
  {
    radioId: "Tete FM",
    src: "https://node.stream-africa.com:8443/TeteFM",
    background: Bk8
  },
  {
    radioId: "LM RADIO",
    src: "https://cast6.asurahosting.com/proxy/lmradioc/stream",
    background: Bk7
  }
];

// Premium Feature Check Component
const PremiumFeature = ({ children, isPremium, onUnlock }) => {
  if (isPremium) return children;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="text-white" size={32} />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Premium Feature</h3>
          <p className="text-gray-300 text-sm mb-4">
            Unlock the Radio Player with Premium
          </p>
          <button
            onClick={onUnlock}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-white font-medium transition-all"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
      <div className="opacity-50 blur-sm pointer-events-none">{children}</div>
    </div>
  );
};

// Mini Player Component (shown when player is minimized)
const MiniPlayer = ({ currentStation, isPlaying, onTogglePlay, onOpen }) => (
  <div className="fixed bottom-4 right-4 z-50 animate-slideUp">
    <div className="bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-700 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl overflow-hidden">
            <img
              src={currentStation?.background}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          {isPlaying && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-white font-medium text-sm line-clamp-1">
            {currentStation?.radioId}
          </p>
          <p className="text-gray-400 text-xs">
            {isPlaying ? "Now Playing" : "Paused"}
          </p>
        </div>
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center transition"
        >
          {isPlaying ? (
            <Pause size={18} className="text-white" />
          ) : (
            <Play size={18} className="text-white" />
          )}
        </button>
        <button
          onClick={onOpen}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition"
        >
          <ChevronUp size={16} className="text-gray-400" />
        </button>
      </div>
    </div>
  </div>
);

export default function RadioPlayer({ isPremium = false, onUpgrade }) {
  const [currentStation, setCurrentStation] = useState(radioStations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [recentStations, setRecentStations] = useState([]);
  const [isPlayerOpen, setIsPlayerOpen] = useState(true);

  const audioRef = useRef(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("radioFavorites");
    if (saved) setFavorites(JSON.parse(saved));
    const savedRecent = localStorage.getItem("radioRecent");
    if (savedRecent) setRecentStations(JSON.parse(savedRecent));
  }, []);

  // Save favorites
  useEffect(() => {
    localStorage.setItem("radioFavorites", JSON.stringify(favorites));
  }, [favorites]);

  // Save recent stations
  useEffect(() => {
    if (currentStation && isPlaying) {
      const updatedRecent = [
        currentStation,
        ...recentStations.filter((s) => s.radioId !== currentStation.radioId)
      ].slice(0, 10);
      setRecentStations(updatedRecent);
      localStorage.setItem("radioRecent", JSON.stringify(updatedRecent));
    }
  }, [currentStation, isPlaying]);

  // Handle audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const changeStation = (station) => {
    setCurrentStation(station);
    setIsPlaying(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  const toggleFavorite = () => {
    if (favorites.some((f) => f.radioId === currentStation.radioId)) {
      setFavorites(
        favorites.filter((f) => f.radioId !== currentStation.radioId)
      );
    } else {
      setFavorites([...favorites, currentStation]);
    }
  };

  const nextStation = () => {
    const currentIndex = radioStations.findIndex(
      (s) => s.radioId === currentStation.radioId
    );
    const nextIndex = (currentIndex + 1) % radioStations.length;
    changeStation(radioStations[nextIndex]);
  };

  const prevStation = () => {
    const currentIndex = radioStations.findIndex(
      (s) => s.radioId === currentStation.radioId
    );
    const prevIndex =
      (currentIndex - 1 + radioStations.length) % radioStations.length;
    changeStation(radioStations[prevIndex]);
  };

  const filteredStations = radioStations.filter((station) =>
    station.radioId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFavorited = favorites.some(
    (f) => f.radioId === currentStation.radioId
  );

  // Premium Feature Check
  if (!isPremium) {
    return (
      <PremiumFeature isPremium={isPremium} onUnlock={onUpgrade}>
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-6 border border-gray-800">
          <RadioPlayerContent />
        </div>
      </PremiumFeature>
    );
  }

  if (isMinimized) {
    return (
      <>
        <MiniPlayer
          currentStation={currentStation}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onOpen={() => setIsMinimized(false)}
        />
        <audio ref={audioRef} src={currentStation.src} />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Radio className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Radio Player</h2>
              <p className="text-xs text-gray-400">
                Premium Feature • Ad-Free Experience
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <ChevronDown size={20} />
            </button>
            <button
              onClick={() => setIsPlayerOpen(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Main Player Section */}
          <div className="flex-1 p-8">
            {/* Album Art */}
            <div className="relative mb-6">
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={currentStation.background}
                  alt={currentStation.radioId}
                  className="w-full h-full object-cover"
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-4">
                    <div className="flex gap-1">
                      <div
                        className="w-1 h-4 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0s" }}
                      />
                      <div
                        className="w-1 h-6 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-1 h-8 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                      <div
                        className="w-1 h-6 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.6s" }}
                      />
                      <div
                        className="w-1 h-4 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.8s" }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={toggleFavorite}
                className="absolute top-2 right-2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition"
              >
                <Heart
                  size={18}
                  className={
                    isFavorited ? "fill-red-500 text-red-500" : "text-white"
                  }
                />
              </button>
            </div>

            {/* Station Info */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-1">
                {currentStation.radioId}
              </h3>
              <p className="text-gray-400 text-sm">
                Live Streaming • {isPlaying ? "Playing Now" : "Paused"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={prevStation}
                className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
              >
                <SkipBack size={20} className="text-white" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-full flex items-center justify-center transition transform hover:scale-105 shadow-lg"
              >
                {isPlaying ? (
                  <Pause size={28} className="text-white" />
                ) : (
                  <Play size={28} className="text-white" />
                )}
              </button>
              <button
                onClick={nextStation}
                className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
              >
                <SkipForward size={20} className="text-white" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-400 hover:text-white"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Station List Section */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-800 bg-gray-900/30">
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search stations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setShowQueue(false)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  !showQueue
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "text-gray-500"
                }`}
              >
                <ListMusic size={14} className="inline mr-2" />
                All Stations
              </button>
              <button
                onClick={() => setShowQueue(true)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  showQueue
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "text-gray-500"
                }`}
              >
                <Heart size={14} className="inline mr-2" />
                Favorites
              </button>
            </div>

            {/* Station List */}
            <div className="h-[400px] overflow-y-auto p-2 custom-scrollbar">
              {(showQueue ? favorites : filteredStations).map((station) => (
                <button
                  key={station.radioId}
                  onClick={() => changeStation(station)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 ${
                    currentStation.radioId === station.radioId
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={station.background}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium line-clamp-1">
                      {station.radioId}
                    </p>
                    <p className="text-gray-500 text-xs">Live Radio</p>
                  </div>
                  {currentStation.radioId === station.radioId && isPlaying && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse" />
                      <div className="w-1 h-3 bg-indigo-400 rounded-full animate-pulse" />
                      <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
              {showQueue && favorites.length === 0 && (
                <div className="text-center py-12">
                  <Heart className="mx-auto text-gray-600 mb-3" size={40} />
                  <p className="text-gray-500">No favorite stations yet</p>
                  <p className="text-gray-600 text-sm">
                    Click the heart icon to add stations
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={currentStation.src}
          onError={() => {
            console.error("Error loading stream");
            toast.error("Unable to play this station");
          }}
        />
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 10px;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// Content component for non-premium users
const RadioPlayerContent = () => (
  <div className="text-center py-12">
    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
      <Radio className="text-white" size={40} />
    </div>
    <h3 className="text-2xl font-bold text-white mb-3">Premium Radio Player</h3>
    <p className="text-gray-400 mb-6 max-w-md mx-auto">
      Upgrade to Premium to access 20+ live radio stations, create favorites,
      and enjoy an ad-free listening experience.
    </p>
    <div className="flex justify-center gap-4 text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-emerald-500" />
        <span>20+ Stations</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-emerald-500" />
        <span>Favorites</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-emerald-500" />
        <span>No Ads</span>
      </div>
    </div>
  </div>
);

// Add missing CheckCircle import
import { CheckCircle } from "lucide-react";
