import { useState, useEffect, useCallback } from "react";

const GOLD = "#F5C518";
const GOLD_DIM = "#B8920F";
const BG = "#0A0A0A";
const CARD = "#141414";
const CARD2 = "#1C1C1C";
const BORDER = "#2A2A2A";
const TEXT = "#F0F0F0";
const MUTED = "#666";
const RED = "#FF4444";
const GREEN = "#44CC88";

const COLORS = [
  "#F5C518","#FF6B35","#44CC88","#4A9EFF","#CC44FF",
  "#FF4488","#FF9500","#00D4AA","#FF3B30","#5856D6"
];
const EMOJIS = ["💧","🏋️","📚","💰","🕌","🏃","🧘","🍎","😴","✍️","🎯","🧹","💊","🚿","📱"];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  try {
    const raw = localStorage.getItem("streakup_v2");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tasks: [], completions: {} };
}

function saveData(data) {
  localStorage.setItem("streakup_v2", JSON.stringify(data));
}

function calcStreak(completions, taskId) {
  let streak = 0;
  let check = new Date();
  check.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const key = check.toISOString().slice(0, 10);
    if (completions[taskId]?.[key]) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      if (i === 0) { check.setDate(check.getDate() - 1); continue; }
      break;
    }
  }
  return streak;
}

function calcBestStreak(completions, taskId) {
  const days = Object.keys((completions[taskId] || {})).sort();
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i-1])) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
  }
  return best;
}

function calcTotal(completions, taskId) {
  return Object.keys(completions[taskId] || {}).length;
}

const s = {
  app: {
    background: BG, color: TEXT, minHeight: "100vh", maxWidth: 430,
    margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden",
  },
  screen: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  header: { padding: "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontWeight: 800, letterSpacing: -0.5 },
  card: { background: CARD, borderRadius: 18, padding: "16px 18px", border: `1px solid ${BORDER}`, marginBottom: 10 },
  btn: (bg = GOLD, color = "#000") => ({
    background: bg, color, border: "none", borderRadius: 14,
    padding: "14px 20px", fontWeight: 700, fontSize: 15,
    cursor: "pointer", width: "100%", letterSpacing: 0.2,
  }),
  iconBtn: {
    background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12,
    width: 42, height: 42, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", fontSize: 20,
  },
  input: {
    background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14,
    padding: "14px 16px", color: TEXT, fontSize: 15, width: "100%",
    outline: "none", boxSizing: "border-box",
  },
  label: { fontSize: 12, color: MUTED, fontWeight: 600, letterSpacing: 0.8, marginBottom: 8, display: "block" },
  progressFill: (pct, color = GOLD) => ({
    height: "100%", width: `${pct}%`, background: color,
    borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
  }),
  nav: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 430, background: "#0E0E0E",
    borderTop: `1px solid ${BORDER}`, display: "flex", padding: "8px 0 16px",
  },
  navItem: (active) => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4, cursor: "pointer", padding: "6px 0", opacity: active ? 1 : 0.4,
  }),
  navLabel: (active) => ({ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? GOLD : MUTED, letterSpacing: 0.5 }),
  streak: (n) => ({ display: "flex", alignItems: "center", gap: 4, color: n > 0 ? GOLD : MUTED, fontWeight: 800, fontSize: 15 }),
  checkbox: (done, color) => ({
    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
    border: done ? "none" : `2px solid ${BORDER}`,
    background: done ? (color || GOLD) : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.2s", fontSize: 14,
  }),
};

function Flame({ streak, size = 18 }) {
  if (streak === 0) return <span style={{ fontSize: size, opacity: 0.3 }}>🔥</span>;
  const glow = streak >= 7 ? `0 0 ${Math.min(streak * 2, 20)}px ${GOLD}88` : "none";
  return <span style={{ fontSize: size, filter: `drop-shadow(${glow})`, display: "inline-block" }}>🔥</span>;
}

function AddTaskScreen({ onSave, onClose, editTask }) {
  const [name, setName] = useState(editTask?.name || "");
  const [emoji, setEmoji] = useState(editTask?.emoji || "⭐");
  const [color, setColor] = useState(editTask?.color || GOLD);
  const [time, setTime] = useState(editTask?.reminderTime || "08:00");
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <div style={{ ...s.screen, padding: "0 0 20px" }}>
      <div style={s.header}>
        <div style={s.title}>{editTask ? "Edit Task" : "New Task"}</div>
        <button onClick={onClose} style={{ ...s.iconBtn, fontSize: 16 }}>✕</button>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={s.label}>ICON</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => setEmojiOpen(!emojiOpen)} style={{
              fontSize: 36, background: CARD2, border: `2px solid ${color}`,
              borderRadius: 16, width: 72, height: 72, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{emoji}</button>
            <span style={{ color: MUTED, fontSize: 13 }}>Tap to change</span>
          </div>
          {emojiOpen && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10,
              marginTop: 14, background: CARD2, borderRadius: 16, padding: 14,
              border: `1px solid ${BORDER}`,
            }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setEmoji(e); setEmojiOpen(false); }} style={{
                  fontSize: 28, background: emoji === e ? `${color}30` : "transparent",
                  border: emoji === e ? `2px solid ${color}` : "2px solid transparent",
                  borderRadius: 12, padding: 8, cursor: "pointer",
                }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span style={s.label}>TASK NAME</span>
          <input style={s.input} placeholder="e.g. Drink Water" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
        </div>
        <div>
          <span style={s.label}>COLOR</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 38, height: 38, borderRadius: 12, background: c,
                border: color === c ? "3px solid #fff" : "3px solid transparent",
                cursor: "pointer", boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
              }} />
            ))}
          </div>
        </div>
        <div>
          <span style={s.label}>REMINDER TIME</span>
          <input type="time" style={{ ...s.input, colorScheme: "dark" }} value={time} onChange={e => setTime(e.target.value)} />
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>🔔 Daily reminder at this time</div>
        </div>
        <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: `${color}20`,
            border: `2px solid ${color}40`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, flexShrink: 0,
          }}>{emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{name || "Task Name"}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>⏰ {time}</div>
          </div>
        </div>
        <button style={s.btn(color, "#000")} onClick={() => { if (name.trim()) onSave({ name: name.trim(), emoji, color, reminderTime: time }); }}>
          {editTask ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, done, streak, onToggle, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{
      ...s.card, display: "flex", alignItems: "center", gap: 14,
      opacity: done ? 0.75 : 1, position: "relative",
      border: done ? `1px solid ${task.color}30` : `1px solid ${BORDER}`,
    }}>
      <button style={s.checkbox(done, task.color)} onClick={onToggle}>
        {done && <span style={{ color: "#000", fontWeight: 900, fontSize: 13 }}>✓</span>}
      </button>
      <div style={{
        width: 44, height: 44, borderRadius: 13, background: `${task.color}18`,
        border: `1.5px solid ${task.color}35`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 22, flexShrink: 0,
      }}>{task.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, textDecoration: done ? "line-through" : "none", color: done ? MUTED : TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>⏰ {task.reminderTime}</div>
      </div>
      <div style={s.streak(streak)}>
        <Flame streak={streak} size={16} />
        <span style={{ fontSize: 14 }}>{streak}</span>
      </div>
      <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 18, padding: "0 4px" }}>⋯</button>
      {menuOpen && (
        <div style={{
          position: "absolute", right: 16, top: "100%", zIndex: 100,
          background: CARD2, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: 8, boxShadow: "0 8px 32px #0008", minWidth: 140,
        }}>
          <button onClick={() => { onEdit(); setMenuOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: TEXT, cursor: "pointer", textAlign: "left", borderRadius: 8, fontSize: 14 }}>✏️ Edit</button>
          <button onClick={() => { onDelete(); setMenuOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: RED, cursor: "pointer", textAlign: "left", borderRadius: 8, fontSize: 14 }}>🗑️ Delete</button>
        </div>
      )}
    </div>
  );
}

function HomeScreen({ data, onToggle, onAddClick, onEditTask, onDeleteTask }) {
  const today = getTodayKey();
  const { tasks, completions } = data;
  const completed = tasks.filter(t => completions[t.id]?.[today]).length;
  const total = tasks.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={s.screen}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div style={s.title}>{greeting} 👋</div>
        </div>
        <div style={{ ...s.card, background: "linear-gradient(135deg, #1A1600 0%, #1C1A00 100%)", border: `1px solid ${GOLD}30`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: GOLD_DIM, fontWeight: 700, letterSpacing: 0.8 }}>TODAY'S PROGRESS</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, marginTop: 2 }}>{completed}<span style={{ fontSize: 16, color: GOLD_DIM }}> /{total}</span></div>
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: `${GOLD}30` }}>{pct}%</div>
          </div>
          <div style={{ height: 6, background: BORDER, borderRadius: 99, overflow: "hidden" }}>
            <div style={s.progressFill(pct)} />
          </div>
          {total > 0 && completed === total && <div style={{ marginTop: 12, fontSize: 13, color: GOLD, fontWeight: 700, textAlign: "center" }}>🎉 All done for today!</div>}
        </div>
        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tasks yet</div>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 28 }}>Add your first habit to start building streaks</div>
            <button style={{ ...s.btn(), maxWidth: 220, margin: "0 auto", display: "block" }} onClick={onAddClick}>+ Add First Task</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>{completed < total ? `${total - completed} REMAINING` : "ALL COMPLETE ✓"}</div>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} done={!!completions[task.id]?.[today]} streak={calcStreak(completions, task.id)} onToggle={() => onToggle(task.id)} onEdit={() => onEditTask(task)} onDelete={() => onDeleteTask(task.id)} />
            ))}
          </div>
        )}
      </div>
      {tasks.length > 0 && <div style={{ padding: "12px 20px 0" }}><button style={s.btn()} onClick={onAddClick}>+ Add Task</button></div>}
    </div>
  );
}

function StatsScreen({ data }) {
  const { tasks, completions } = data;
  const totalCompleted = tasks.reduce((sum, t) => sum + calcTotal(completions, t.id), 0);
  const bestOverall = tasks.reduce((best, t) => Math.max(best, calcBestStreak(completions, t.id)), 0);
  const activeStreaks = tasks.filter(t => calcStreak(completions, t.id) > 0).length;

  return (
    <div style={s.screen}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={s.title}>Statistics</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Your habit journey</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[{ label: "Total Done", value: totalCompleted, icon: "✅" }, { label: "Best Streak", value: bestOverall, icon: "🔥" }, { label: "Active Now", value: activeStreaks, icon: "⚡" }].map(({ label, value, icon }) => (
            <div key={label} style={{ ...s.card, textAlign: "center", padding: "18px 10px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{value}</div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
            <div>Add tasks to see your stats</div>
          </div>
        ) : tasks.map(task => {
          const streak = calcStreak(completions, task.id);
          const best = calcBestStreak(completions, task.id);
          const total = calcTotal(completions, task.id);
          const bestPct = best > 0 ? Math.round((streak / best) * 100) : 0;
          return (
            <div key={task.id} style={{ ...s.card, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${task.color}18`, border: `1.5px solid ${task.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{task.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{task.name}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{total} total completions</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...s.streak(streak), justifyContent: "flex-end" }}><Flame streak={streak} size={14} /><span style={{ fontSize: 18, fontWeight: 900 }}>{streak}</span></div>
                  <div style={{ fontSize: 10, color: MUTED }}>current</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                {[{ label: "CURRENT", value: streak, color: task.color }, { label: "BEST", value: best, color: GOLD }, { label: "TOTAL", value: total, color: TEXT }].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, background: CARD2, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {best > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>Progress to best streak</span>
                    <span style={{ fontSize: 11, color: task.color, fontWeight: 700 }}>{bestPct}%</span>
                  </div>
                  <div style={{ height: 6, background: BORDER, borderRadius: 99, overflow: "hidden" }}>
                    <div style={s.progressFill(bestPct, task.color)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StreakUp() {
  const [data, setData] = useState(loadData);
  const [screen, setScreen] = useState("home");
  const [editTask, setEditTask] = useState(null);

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  useEffect(() => {
    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const today = getTodayKey();
      data.tasks.forEach(task => {
        if (task.reminderTime === hhmm && !data.completions[task.id]?.[today]) {
          new Notification(`StreakUp: ${task.emoji} ${task.name}`, { body: `Don't break your streak! 🔥 ${calcStreak(data.completions, task.id)} days` });
        }
      });
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [data]);

  const toggleTask = useCallback((taskId) => {
    const today = getTodayKey();
    setData(prev => {
      const taskCompletions = { ...(prev.completions[taskId] || {}) };
      if (taskCompletions[today]) delete taskCompletions[today];
      else taskCompletions[today] = true;
      return { ...prev, completions: { ...prev.completions, [taskId]: taskCompletions } };
    });
  }, []);

  const saveTask = useCallback((taskData) => {
    setData(prev => {
      if (editTask) return { ...prev, tasks: prev.tasks.map(t => t.id === editTask.id ? { ...t, ...taskData } : t) };
      return { ...prev, tasks: [...prev.tasks, { id: Date.now().toString(), ...taskData }] };
    });
    setEditTask(null);
    setScreen("home");
  }, [editTask]);

  const deleteTask = useCallback((taskId) => {
    setData(prev => {
      const completions = { ...prev.completions };
      delete completions[taskId];
      return { ...prev, tasks: prev.tasks.filter(t => t.id !== taskId), completions };
    });
  }, []);

  return (
    <div style={s.app}>
      {screen === "home" && <HomeScreen data={data} onToggle={toggleTask} onAddClick={() => { setEditTask(null); setScreen("add"); }} onEditTask={t => { setEditTask(t); setScreen("add"); }} onDeleteTask={deleteTask} />}
      {screen === "add" && <AddTaskScreen onSave={saveTask} onClose={() => { setEditTask(null); setScreen("home"); }} editTask={editTask} />}
      {screen === "stats" && <StatsScreen data={data} />}
      {screen !== "add" && (
        <nav style={s.nav}>
          <div style={s.navItem(screen === "home")} onClick={() => setScreen("home")}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <span style={s.navLabel(screen === "home")}>TODAY</span>
          </div>
          <div style={s.navItem(false)} onClick={() => { setEditTask(null); setScreen("add"); }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -18, boxShadow: `0 4px 20px ${GOLD}60`, fontSize: 26, color: "#000", fontWeight: 900 }}>+</div>
          </div>
          <div style={s.navItem(screen === "stats")} onClick={() => setScreen("stats")}>
            <span style={{ fontSize: 22 }}>📊</span>
            <span style={s.navLabel(screen === "stats")}>STATS</span>
          </div>
        </nav>
      )}
    </div>
  );
}
