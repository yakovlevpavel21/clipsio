// client/src/pages/UploaderPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Zap, Play, CheckCircle2, History, ExternalLink, Eye, MoreHorizontal } from 'lucide-react';
import TaskCardUploader from '../components/TaskCardUploader';
import PublishModal from '../components/PublishModal';

export default function UploaderPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/uploader/tasks');
      setTasks(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-blue-500 font-semibold text-sm uppercase tracking-widest animate-pulse">Загрузка очереди...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      <header className="pt-10 mb-10 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Публикация</h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 font-medium">Проверьте готовые реакции и выложите их на YouTube.</p>
      </header>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-medium uppercase tracking-widest opacity-50 border-2 border-dashed dark:border-slate-800 rounded-[2rem]">
            Очередь пуста 🎉
          </div>
        ) : (
          tasks.map(task => (
            <TaskCardUploader 
              key={task.id} 
              task={task} 
              onReview={() => setSelectedTask(task)} 
            />
          ))
        )}
      </div>

      {selectedTask && (
        <PublishModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onSuccess={() => { setSelectedTask(null); fetchTasks(); }} 
        />
      )}
    </div>
  );
}