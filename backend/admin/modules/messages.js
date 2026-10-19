// modules/messages.js — 聊天管理（私信 + 群聊）
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let msgP = 1, msgMode = 'private'; // 'private' | 'group' | 'search'

window.loadMessages = loadMessages;

export async function loadMessages(page) {
  msgP = page || msgP;

  if (msgMode === 'search') { loadMessageSearch(msgP); return; }

  const isPrivate = msgMode === 'private';
  const url = isPrivate
    ? `/api/admin/messages/conversations?page=${msgP}&pageSize=15`
    : `/api/admin/messages/group-chats?page=${msgP}&pageSize=15`;

  // 更新表头
  const msgHead = document.getElementById('msgHead');
  if (isPrivate) {
    msgHead.innerHTML = '<tr><th>用户A</th><th>用户B</th><th>最后消息</th><th>消息数</th><th>最后时间</th><th>操作</th></tr>';
  } else {
    msgHead.innerHTML = '<tr><th>路线</th><th>创建者</th><th>参与者</th><th>最后消息</th><th>总消息</th><th>最后时间</th><th>操作</th></tr>';
  }

  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  if (isPrivate) {
    document.getElementById('msgBody').innerHTML = list.map(c => {
      const u1 = c.user1 || {};
      const u2 = c.user2 || {};
      const lastContent = c.lastMessage ? esc((c.lastMessage.content||'').substring(0, 40)) : '-';
      const statusBadge1 = u1.status === 'banned' ? '<span class="bs banned">封禁</span>' : (u1.status === 'disabled' ? '<span class="bs disabled">禁用</span>' : '');
      const statusBadge2 = u2.status === 'banned' ? '<span class="bs banned">封禁</span>' : (u2.status === 'disabled' ? '<span class="bs disabled">禁用</span>' : '');
      return `<tr>
        <td>${esc(u1.nickName||'未知')} ${statusBadge1}</td>
        <td>${esc(u2.nickName||'未知')} ${statusBadge2}</td>
        <td>${lastContent}</td>
        <td>${c.totalMessages||0}</td>
        <td>${fmt(c.lastTime)}</td>
        <td><button class="ab" onclick="viewConversation('${c.conversationId}')">查看聊天</button>
        <button class="ab d" onclick="deleteConversation('${c.conversationId}')">删除</button></td></tr>`;
    }).join('') || emptyRow(6);
  } else {
    document.getElementById('msgBody').innerHTML = list.map(g => {
      const lastContent = g.lastMessage ? esc((g.lastMessage.content||'').substring(0, 40)) : '-';
      return `<tr>
        <td>${esc(g.route)}</td>
        <td>${esc(g.creator||'-')}</td>
        <td>${g.participantCount||0}人</td>
        <td>${lastContent}</td>
        <td>${g.totalMessages||0}</td>
        <td>${fmt(g.lastTime)}</td>
        <td><button class="ab" onclick="viewGroupChat(${g.carpoolId})">查看聊天</button>
        <button class="ab d" onclick="deleteGroupChat(${g.carpoolId})">删除</button></td></tr>`;
    }).join('') || emptyRow(7);
  }
  renderPg('msgPg', d.totalPages||1, msgP, loadMessages);
}

// 切换私信/群聊/搜索
window.setMsgMode = function(mode) {
  msgMode = mode; msgP = 1;
  document.querySelectorAll('.msg-tab').forEach(el => el.classList.toggle('active', el.dataset.mode === mode));
  // 搜索模式下显示搜索框
  document.getElementById('msgSearchBox').style.display = mode === 'search' ? 'flex' : 'none';
  loadMessages(1);
};

// 搜索消息
window.doMsgSearch = function() {
  const msgKW = document.getElementById("msgKeyword").value.trim();
  if (!msgKW) { window.toast('请输入搜索关键词', 'error'); return; }
  msgMode = 'search'; msgP = 1;
  loadMessages(1);
};

async function loadMessageSearch(page) {
  const msgKW = document.getElementById("msgKeyword").value.trim();
  if (!msgKW) return;
  document.getElementById('msgHead').innerHTML = '<tr><th>发送者</th><th>接收者</th><th>内容</th><th>类型</th><th>时间</th><th>操作</th></tr>';
  const res = await api('GET', `/api/admin/messages/search?keyword=${encodeURIComponent(msgKW)}&page=${page}&pageSize=20`);
  const d = res.data || {}; const list = d.list || [];
  document.getElementById('msgBody').innerHTML = list.map(m => {
    const sender = m.sender || {};
    const receiver = m.receiver || {};
    return `<tr>
      <td>${esc(sender.nickName||'')}</td>
      <td>→ ${esc(receiver.nickName||'')}</td>
      <td>${esc((m.content||'').substring(0, 60))}</td>
      <td>${m.type||'text'}</td>
      <td>${fmt(m.createTime)}</td>
      <td><button class="ab" onclick="viewConversation('${m.conversationId}')">查看对话</button>
      <button class="ab d" onclick="deleteMsgAdmin(${m.id})">删除</button></td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('msgPg', d.totalPages||1, msgP, loadMessages);
}

// ========== 查看私信对话 ==========

window.viewConversation = async function(conversationId) {
  window.toast('加载中...', 'info');
  const res = await api('GET', `/api/admin/messages/conversation/${conversationId}?page=1&pageSize=100`);
  if (!res.success) { window.toast(res.message, 'error'); return; }
  const d = res.data || {};
  const messages = d.list || [];
  const users = d.users || [];

  // 生成用户操作按钮
  const userActions = users.map(u => {
    const isBanned = u.status === 'banned' || u.status === 'disabled';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-weight:600">${esc(u.nickName||'未知')}</span>
      <span class="bs ${u.status==='active'?'active':'banned'}">${u.status==='active'?'正常':(u.status==='banned'?'已封禁':'已禁用')}</span>
      <span style="color:var(--t3);font-size:12px">信用:${u.creditScore||0}</span>
      <span style="color:var(--t3);font-size:12px">${esc(u.phone||'无手机')}</span>
      <button class="ab ${isBanned?'s':'d'}" onclick="toggleUserBan('${u.id}','${u.status}')">${isBanned?'解封':'封禁'}</button>
      <button class="ab" onclick="switchPage('users');setTimeout(()=>{document.getElementById('userSearch').value='${u.id}';loadUsers(1)},500)">查看用户</button>
    </div>`;
  }).join('');

  // 消息列表（倒序显示）
  const msgHtml = messages.reverse().map(m => {
    const isRecalled = m.isRecalled;
    const content = isRecalled ? '<span style="color:var(--t3);font-style:italic">此消息已撤回</span>' : esc(m.content||'');
    const isImage = m.type === 'image' && m.imageUrl;
    const imgHtml = isImage ? `<br><img src="${esc(m.imageUrl)}" style="max-width:200px;max-height:200px;border-radius:6px;margin-top:4px">` : '';
    const senderName = m.sender ? m.sender.nickName : '未知';
    return `<div style="padding:8px 0;border-bottom:1px solid var(--bd)">
      <span style="color:var(--acc);font-weight:600">${esc(senderName)}</span>
      <span style="color:var(--t3);font-size:11px;margin-left:8px">${fmt(m.createTime)}</span>
      ${isRecalled ? '' : `<span style="color:var(--r);font-size:11px;margin-left:8px;cursor:pointer" onclick="recallMsgAdmin(${m.id})" title="撤回消息">撤回</span>`}
      <div style="margin-top:2px;white-space:pre-wrap">${content}${imgHtml}</div>
    </div>`;
  }).join('');

  window.showModal(`私信对话 (${messages.length}条)`,
    `<div style="margin-bottom:12px">${userActions}</div>
    <div style="max-height:500px;overflow-y:auto">${msgHtml || '<div style="text-align:center;padding:20px;color:var(--t3)">暂无消息</div>'}</div>`
  );
};

// ========== 查看群聊 ==========

window.viewGroupChat = async function(carpoolId) {
  window.toast('加载中...', 'info');
  const res = await api('GET', `/api/admin/messages/group-chat/${carpoolId}?page=1&pageSize=100`);
  if (!res.success) { window.toast(res.message, 'error'); return; }
  const d = res.data || {};
  const messages = d.list || [];

  const msgHtml = messages.reverse().map(m => {
    const isRecalled = m.isRecalled;
    const content = isRecalled ? '<span style="color:var(--t3);font-style:italic">此消息已撤回</span>' : esc(m.content||'');
    const isImage = m.type === 'image' && m.imageUrl;
    const imgHtml = isImage ? `<br><img src="${esc(m.imageUrl)}" style="max-width:200px;max-height:200px;border-radius:6px;margin-top:4px">` : '';
    const sender = m.sender || {};
    return `<div style="padding:8px 0;border-bottom:1px solid var(--bd)">
      <span style="color:var(--acc);font-weight:600">${esc(sender.nickName||'未知')}</span>
      <span style="color:var(--t3);font-size:11px;margin-left:8px">${fmt(m.createTime)}</span>
      ${isRecalled ? '' : `<span style="color:var(--r);font-size:11px;margin-left:8px;cursor:pointer" onclick="recallMsgAdmin(${m.id})" title="撤回消息">撤回</span>`}
      <div style="margin-top:2px;white-space:pre-wrap">${content}${imgHtml}</div>
    </div>`;
  }).join('');

  window.showModal(`群聊消息 (拼车#${carpoolId}, ${messages.length}条)`,
    `<div style="max-height:500px;overflow-y:auto">${msgHtml || '<div style="text-align:center;padding:20px;color:var(--t3)">暂无消息</div>'}</div>`
  );
};

// ========== 管理员撤回消息 ==========

window.recallMsgAdmin = async function(msgId) {
  if (!confirm('确认撤回此消息？')) return;
  // 通过标准消息撤回API操作（管理员没有专门的撤回接口，用直接SQL设置isRecalled）
  // 这里暂时用前端提示，后端需要添加管理员撤回接口
  const res = await api('PUT', `/api/messages/${msgId}/recall`);
  if (res.success) {
    window.toast('消息已撤回', 'success');
    closeModal();
  } else {
    window.toast(res.message || '撤回失败（可能需要2分钟内）', 'error');
  }
};

// ========== 封禁用户 ==========

window.toggleUserBan = async function(userId, curSt) {
  const isBan = curSt === 'active';
  const reason = prompt(isBan ? '封禁原因（可选）：' : '解封原因（可选）：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/users/${userId}/ban`, { action: isBan ? 'ban' : 'unban', reason: reason || '' });
  if (res.success) {
    window.toast(isBan ? '已封禁' : '已解封', 'success');
    closeModal();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

// ========== 删除消息 ==========

window.deleteMsgAdmin = async function(msgId) {
  if (!confirm('确认删除该消息？')) return;
  const res = await api('DELETE', `/api/admin/messages/${msgId}`);
  if (res.success) { window.toast('已删除', 'success'); loadMessages(); }
  else window.toast(res.message || '删除失败', 'error');
};

window.deleteConversation = async function(conversationId) {
  if (!confirm('确认删除该对话的所有消息？')) return;
  const res = await api('DELETE', `/api/admin/messages/${conversationId}?conversation=1`);
  if (res.success) { window.toast('已删除', 'success'); loadMessages(); }
  else window.toast(res.message || '删除失败', 'error');
};

window.deleteGroupChat = async function(carpoolId) {
  if (!confirm('确认删除该群聊的所有消息？')) return;
  const res = await api('DELETE', `/api/admin/messages/${carpoolId}?group=1`);
  if (res.success) { window.toast('已删除', 'success'); loadMessages(); }
  else window.toast(res.message || '删除失败', 'error');
};
