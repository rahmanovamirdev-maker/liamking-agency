import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { Eye, MessageSquare, Pin, ArrowLeft, Send } from 'lucide-react';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState('');

  useEffect(() => { loadPost(); }, [id]);

  async function loadPost() {
    try {
      const data = await api.get<any>(`/posts/${id}`);
      setPost(data);
    } catch { /* ignore */ }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/posts/${id}/comments`, { content: comment });
      setComment('');
      loadPost();
      toast.success('Комментарий добавлен');
    } catch (err: any) { toast.error(err.message); }
  }

  if (!post) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-white transition">
        <ArrowLeft size={18} /> Назад
      </button>

      <article className="card">
        <div className="flex items-center gap-2 mb-2">
          {post.is_pinned === 1 && <Pin size={14} className="text-amber-400" />}
        </div>
        <h1 className="text-2xl font-bold text-white">{post.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-dark-500">
          <span>{post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleString('ru', { timeZone: 'Europe/Moscow' })}</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {post.views}</span>
        </div>
        <div className="mt-6 text-dark-200 whitespace-pre-wrap leading-relaxed">{post.content}</div>
      </article>

      {/* Comments */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          <MessageSquare size={18} className="inline mr-2" />
          Комментарии ({post.comments?.length || 0})
        </h2>

        {post.comments?.map((c: any) => (
          <div key={c.id} className="flex gap-3 p-3 bg-dark-800 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
              {c.user_name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{c.user_name}</span>
                <span className="text-xs text-dark-500">{new Date(c.created_at).toLocaleString('ru', { timeZone: 'Europe/Moscow' })}</span>
              </div>
              <p className="text-sm text-dark-300 mt-1">{c.content}</p>
            </div>
          </div>
        ))}

        <form onSubmit={addComment} className="flex gap-2 mt-4">
          <input value={comment} onChange={e => setComment(e.target.value)}
            className="input-field flex-1" placeholder="Написать комментарий..." />
          <button type="submit" className="btn-primary flex items-center gap-1">
            <Send size={14} /> Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
