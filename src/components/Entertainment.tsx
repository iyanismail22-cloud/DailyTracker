import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Film, 
  Star, 
  Trash2, 
  Plus, 
  X, 
  Check, 
  Tv, 
  Search,
  Book,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User } from 'firebase/auth';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';

interface BookItem {
  id: string;
  title: string;
  author: string;
  status: 'want' | 'reading' | 'finished';
  rating: number;
  coverUrl?: string;
}

interface MovieItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  status: 'want' | 'watching' | 'finished';
  rating: number;
  posterUrl: string;
  currentEpisode?: number;
  totalEpisodes?: number;
}

export default function Entertainment({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'books' | 'movies'>('books');
  const [books, setBooks] = useState<BookItem[]>([]);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [authorOrType, setAuthorOrType] = useState('');
  const [coverOrPosterUrl, setCoverOrPosterUrl] = useState('');
  const [episodes, setEpisodes] = useState('1');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const booksPath = `users/${user.uid}/books`;
    const moviesPath = `users/${user.uid}/movies`;

    const unsubscribeBooks = onSnapshot(collection(db, booksPath), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookItem)));
    });

    const unsubscribeMovies = onSnapshot(collection(db, moviesPath), (snapshot) => {
      setMovies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MovieItem)));
    });

    setIsLoading(false);
    return () => {
      unsubscribeBooks();
      unsubscribeMovies();
    };
  }, [user.uid]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverOrPosterUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      if (activeTab === 'books') {
        const path = `users/${user.uid}/books`;
        await addDoc(collection(db, path), {
          title,
          author: authorOrType,
          status: 'want',
          rating: 0,
          coverUrl: coverOrPosterUrl || 'https://images.unsplash.com/photo-1543005127-d64ae8a4914d?auto=format&fit=crop&q=80&w=400',
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      } else {
        const path = `users/${user.uid}/movies`;
        await addDoc(collection(db, path), {
          title,
          type: authorOrType as 'movie' | 'series',
          posterUrl: coverOrPosterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
          status: 'want',
          rating: 0,
          currentEpisode: 0,
          totalEpisodes: parseInt(episodes) || 1,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, activeTab === 'books' ? `users/${user.uid}/books` : `users/${user.uid}/movies`, auth);
    }
  };

  const updateBookStatus = async (id: string, status: BookItem['status']) => {
    const path = `users/${user.uid}/books/${id}`;
    try {
      await updateDoc(doc(db, path), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  };

  const updateMovieStatus = async (id: string, status: MovieItem['status']) => {
    const path = `users/${user.uid}/movies/${id}`;
    try {
      await updateDoc(doc(db, path), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  };

  const updateMovieProgress = async (id: string, current: number) => {
    const path = `users/${user.uid}/movies/${id}`;
    try {
      await updateDoc(doc(db, path), { currentEpisode: current });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  };

  const updateRating = async (id: string, type: 'books' | 'movies', rating: number) => {
    const path = `users/${user.uid}/${type}/${id}`;
    try {
      await updateDoc(doc(db, path), { rating });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  };

  const deleteItem = async (id: string, type: 'books' | 'movies') => {
    const path = `users/${user.uid}/${type}/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, auth);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAuthorOrType(activeTab === 'books' ? '' : 'movie');
    setCoverOrPosterUrl('');
    setEpisodes('1');
    setShowAddModal(false);
  };

  // Stats
  const booksRead = books.filter(b => b.status === 'finished').length;
  const moviesWatched = movies.filter(m => m.type === 'movie' && m.status === 'finished').length;
  const seriesFinished = movies.filter(m => m.type === 'series' && m.status === 'finished').length;

  const RatingStars = ({ rating, onRate }: { rating: number, onRate: (r: number) => void }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button 
          key={star}
          onClick={(e) => { e.stopPropagation(); onRate(star); }}
          className={cn(
            "transition-all duration-300",
            star <= rating ? "text-yellow-400 fill-yellow-400 scale-110" : "text-white/20 hover:text-white/40"
          )}
        >
          <Star size={14} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-10 pb-20 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Media & Entertainment</h1>
          <p className="text-glass-muted text-sm font-medium">Lacak buku bacaan dan tontonan favoritmu.</p>
        </div>
        
        <div className="flex items-center glass-card p-1.5 space-x-1 shrink-0">
          <button 
            onClick={() => setActiveTab('books')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
              activeTab === 'books' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-glass-muted hover:text-white"
            )}
          >
            Books
          </button>
          <button 
            onClick={() => setActiveTab('movies')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
              activeTab === 'movies' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-glass-muted hover:text-white"
            )}
          >
            Movies
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-indigo-500/5 border-indigo-500/10 flex items-center space-x-5 transition-all hover:bg-indigo-500/10">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-2">Books Read</p>
            <h4 className="text-3xl font-black text-white">{booksRead}</h4>
          </div>
        </div>
        <div className="glass-card p-6 bg-pink-500/5 border-pink-500/10 flex items-center space-x-5 transition-all hover:bg-pink-500/10">
          <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
            <Film size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none mb-2">Movies</p>
            <h4 className="text-3xl font-black text-white">{moviesWatched}</h4>
          </div>
        </div>
        <div className="glass-card p-6 bg-orange-500/5 border-orange-500/10 flex items-center space-x-5 transition-all hover:bg-orange-500/10">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Tv size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-2">Series</p>
            <h4 className="text-3xl font-black text-white">{seriesFinished}</h4>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={() => {
            setAuthorOrType(activeTab === 'books' ? '' : 'movie');
            setShowAddModal(true);
          }}
          className="glass-button bg-white/[0.03] border-white/5 hover:bg-white/[0.08] flex items-center space-x-3 text-white px-8 h-14"
        >
          <Plus size={20} className="text-indigo-400" />
          <span className="font-black text-xs uppercase tracking-widest">
            Tambah {activeTab === 'books' ? 'Buku' : 'Movie'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeTab === 'books' ? (
          books.map((book) => (
            <motion.div 
              layout
              key={book.id}
              className="glass-card overflow-hidden bg-white/[0.03] flex flex-col group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all border-white/5"
            >
              <div className="relative aspect-[2/3] overflow-hidden">
                <img 
                  src={book.coverUrl || 'https://images.unsplash.com/photo-1543005127-d64ae8a4914d?auto=format&fit=crop&q=80&w=400'} 
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-90" />
                <div className="absolute top-4 right-4 group-hover:opacity-100 transition-opacity">
                  <RatingStars rating={book.rating} onRate={(r) => updateRating(book.id, 'books', r)} />
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-black text-white leading-tight mb-1 drop-shadow-md">{book.title}</h3>
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest drop-shadow-md">{book.author}</p>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between">
                <select 
                  value={book.status}
                  onChange={(e) => updateBookStatus(book.id, e.target.value as BookItem['status'])}
                  className="bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 outline-none cursor-pointer"
                >
                  <option value="want" className="bg-[#1e293b]">To Read</option>
                  <option value="reading" className="bg-[#1e293b]">Reading</option>
                  <option value="finished" className="bg-[#1e293b]">Finished</option>
                </select>
                <button 
                  onClick={() => deleteItem(book.id, 'books')}
                  className="p-2 text-pink-500 opacity-40 hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          movies.map((movie) => (
            <motion.div 
              layout
              key={movie.id}
              className="glass-card overflow-hidden bg-white/[0.03] flex flex-col group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all border-white/5"
            >
              <div className="relative aspect-[2/3] overflow-hidden">
                <img 
                  src={movie.posterUrl} 
                  alt={movie.title}
                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-90" />
                
                <div className="absolute top-4 left-4">
                  <div className="glass-card px-3 py-1 rounded-full border-white/20 bg-black/40 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                      {movie.type}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-black text-white leading-tight mb-2 drop-shadow-lg">{movie.title}</h3>
                  <RatingStars rating={movie.rating} onRate={(r) => updateRating(movie.id, 'movies', r)} />
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <select 
                    value={movie.status}
                    onChange={(e) => updateMovieStatus(movie.id, e.target.value as MovieItem['status'])}
                    className="bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 outline-none cursor-pointer"
                  >
                    <option value="want" className="bg-[#1e293b]">To Watch</option>
                    <option value="watching" className="bg-[#1e293b]">Watching</option>
                    <option value="finished" className="bg-[#1e293b]">Finished</option>
                  </select>
                </div>

                {movie.type === 'series' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-glass-muted">
                      <span>Watching Progress</span>
                      <span className="text-white">{movie.currentEpisode} / {movie.totalEpisodes} Eps</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((movie.currentEpisode || 0) / (movie.totalEpisodes || 1)) * 100, 100)}%` }}
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" 
                      />
                    </div>
                    <button 
                      disabled={movie.currentEpisode === movie.totalEpisodes}
                      onClick={() => updateMovieProgress(movie.id, Math.min(movie.totalEpisodes || 1, (movie.currentEpisode || 0) + 1))}
                      className="w-full glass-button !py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20 flex items-center justify-center space-x-2 group/btn"
                    >
                      <Check size={14} className="group-hover/btn:scale-125 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {movie.currentEpisode === movie.totalEpisodes ? 'Finished' : `Check Episode ${ (movie.currentEpisode || 0) + 1}`}
                      </span>
                    </button>
                    {movie.currentEpisode && movie.currentEpisode > 0 ? (
                      <button 
                        onClick={() => updateMovieProgress(movie.id, Math.max(0, (movie.currentEpisode || 0) - 1))}
                        className="w-full text-[9px] font-bold text-glass-muted hover:text-white transition-colors text-center uppercase tracking-widest pt-1"
                      >
                        Oops, go back 1 episode
                      </button>
                    ) : null}
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-glass-muted opacity-40">
                    ID: {movie.id.slice(0, 4)}
                  </span>
                  <button 
                    onClick={() => deleteItem(movie.id, 'movies')}
                    className="p-2 text-pink-500 opacity-40 hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass-card w-full max-w-md p-10 bg-[#1e293b]/90 border-white/20 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white">Add {activeTab === 'books' ? 'Book' : 'Movie'}</h3>
                <button onClick={resetForm} className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={addItem} className="space-y-6">
                <div className="space-y-4">
                  {/* Image Upload Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Poster / Cover</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                      />
                      <div className="glass-card border-dashed border-2 border-white/10 p-8 flex flex-col items-center justify-center space-y-4 group-hover:bg-white/5 group-hover:border-indigo-500/30 transition-all overflow-hidden min-h-[200px]">
                        {coverOrPosterUrl ? (
                          <img src={coverOrPosterUrl} className="w-24 h-32 object-cover rounded shadow-xl" />
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-glass-muted">
                              {isUploading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
                              ) : (
                                <Plus size={24} />
                              )}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-glass-muted">Klik atau drag untuk upload</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Judul</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan judul..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="glass-input w-full p-4 font-bold text-white focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                  </div>

                  {activeTab === 'books' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Penulis</label>
                      <input 
                        type="text" 
                        placeholder="Nama penulis..."
                        value={authorOrType}
                        onChange={(e) => setAuthorOrType(e.target.value)}
                        className="glass-input w-full p-4 font-bold text-white focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Tipe</label>
                        <select 
                          value={authorOrType}
                          onChange={(e) => setAuthorOrType(e.target.value)}
                          className="glass-input w-full p-4 font-bold text-white focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-transparent"
                        >
                          <option value="movie" className="bg-[#1e293b]">Movie</option>
                          <option value="series" className="bg-[#1e293b]">Series</option>
                        </select>
                      </div>

                      {authorOrType === 'series' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Total Episode</label>
                          <input 
                            type="number" 
                            value={episodes}
                            onChange={(e) => setEpisodes(e.target.value)}
                            className="glass-input w-full p-4 font-bold text-white focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button 
                  type="submit"
                  className="glass-button w-full py-5 text-lg font-black bg-indigo-500 text-white mt-4"
                >
                  Save to {activeTab === 'books' ? 'Library' : 'Watchlist'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
