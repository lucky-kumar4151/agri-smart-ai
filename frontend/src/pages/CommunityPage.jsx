import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { communityAPI } from '../services/api';
import { useToast } from '../components/Toast';

export default function CommunityPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState('');
    const [newTags, setNewTags] = useState('');
    const [posting, setPosting] = useState(false);
    const [replyInput, setReplyInput] = useState({});
    const [expandedPost, setExpandedPost] = useState(null);
    const toast = useToast();

    useEffect(() => { loadPosts(); }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const res = await communityAPI.getPosts(30);
            setPosts(res.data?.posts || []);
        } catch { setPosts([]); }
        finally { setLoading(false); }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim() || posting) return;
        setPosting(true);
        try {
            const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
            await communityAPI.createPost({ question: newPost.trim(), tags });
            setNewPost('');
            setNewTags('');
            await loadPosts();
            toast.success('Post created!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create post');
        } finally { setPosting(false); }
    };

    const handleReply = async (postId) => {
        const content = replyInput[postId]?.trim();
        if (!content) return;
        try {
            await communityAPI.replyToPost(postId, { content });
            setReplyInput(p => ({ ...p, [postId]: '' }));
            await loadPosts();
            toast.success('Reply posted!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to reply');
        }
    };

    const handleDelete = async (postId) => {
        if (!confirm('Delete this post?')) return;
        try {
            await communityAPI.deletePost(postId);
            await loadPosts();
            toast.success('Post deleted.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>🌾 Community Forum</h1>
                <p>Connect with fellow farmers, share knowledge, and ask questions</p>
            </div>

            {/* Create Post */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: 'white', flexShrink: 0
                    }}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <textarea
                            className="input-field"
                            placeholder="Ask a question or share farming knowledge..."
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
                            <input
                                className="input-field"
                                placeholder="Tags: rice, fertilizer"
                                value={newTags}
                                onChange={e => setNewTags(e.target.value)}
                                style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                            />
                            <button className="btn btn-primary btn-sm" disabled={!newPost.trim() || posting}
                                onClick={handleCreatePost}>
                                {posting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts List */}
            {loading ? (
                <div className="flex-center" style={{ height: '30vh' }}><div className="spinner" /></div>
            ) : posts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <h3>No posts yet</h3>
                        <p>Be the first to ask a question or share your farming knowledge!</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {posts.map(post => (
                        <div key={post._id} className="card" style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: '#e8f5e9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, fontWeight: 700, color: '#2d7a3a', flexShrink: 0
                                }}>
                                    {post.author?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{post.author}</span>
                                        <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>{post.role}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {timeAgo(post.created_at)}</span>
                                    </div>
                                    <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{post.question}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {(post.tags || []).map(tag => (
                                                <span key={tag} style={{
                                                    padding: '2px 8px', borderRadius: 6, fontSize: 11,
                                                    background: 'var(--primary-50)', color: 'var(--primary)',
                                                    fontWeight: 500
                                                }}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <button onClick={() => setExpandedPost(expandedPost === post._id ? null : post._id)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: 12, color: 'var(--text-muted)', fontWeight: 500
                                            }}>
                                            💬 {post.reply_count || 0} replies
                                        </button>
                                        {post.user_id === user?.id && (
                                            <button onClick={() => handleDelete(post._id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>

                                    {/* Replies */}
                                    {expandedPost === post._id && (
                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                                            {(post.replies || []).map((r, i) => (
                                                <div key={i} style={{
                                                    padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                                                    background: 'var(--bg-input)', fontSize: 13
                                                }}>
                                                    <span style={{ fontWeight: 600 }}>{r.author}</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> · {timeAgo(r.created_at)}</span>
                                                    <p style={{ marginTop: 4 }}>{r.content}</p>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <input
                                                    className="input-field"
                                                    placeholder="Write a reply..."
                                                    value={replyInput[post._id] || ''}
                                                    onChange={e => setReplyInput(p => ({ ...p, [post._id]: e.target.value }))}
                                                    onKeyDown={e => e.key === 'Enter' && handleReply(post._id)}
                                                    style={{ flex: 1, fontSize: 12 }}
                                                />
                                                <button className="btn btn-primary btn-sm"
                                                    onClick={() => handleReply(post._id)}
                                                    disabled={!(replyInput[post._id]?.trim())}>
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
