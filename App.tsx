import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type Item = {
  id: string;
  user_id: string;
  item_type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location: string;
  image_url: string | null;
  status: string;
  created_at: string;
};

const css = `
*{box-sizing:border-box}
body{margin:0;background:#f5f7fb;color:#18243b;font-family:Arial,sans-serif}
button,input,textarea,select{font:inherit}
button{cursor:pointer}
.wrap{max-width:1100px;margin:auto;padding:22px}
.header{background:#fff;border-bottom:1px solid #e8edf5;position:sticky;top:0;z-index:5}
.nav{max-width:1100px;margin:auto;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{font-size:25px;font-weight:900;color:#2549a5}
.logo span{color:#18a77a}
.btn{border:0;border-radius:9px;padding:11px 17px;background:#294eae;color:white;font-weight:700}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.light{background:#edf2ff;color:#294eae}
.btn.green{background:#11976d}
.btn.red{background:#fff0ed;color:#c34b38}
.panel{background:white;border:1px solid #e6ebf3;border-radius:15px;padding:22px;margin-bottom:18px}
.hero{background:linear-gradient(120deg,#193779,#315fbd);color:white;border-radius:20px;padding:38px 30px;margin:22px 0}
.hero h1{font-size:34px;margin:0 0 12px}
.hero p{line-height:1.7;color:#e3eaff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:15px}
.field{width:100%;padding:12px;border:1px solid #dce3ef;border-radius:9px;margin:7px 0 14px;background:white}
label{font-size:13px;font-weight:700;color:#53617a}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}
.tab{border:1px solid #dce3ef;background:white;padding:10px 16px;border-radius:9px;color:#34415a}
.tab.active{background:#294eae;color:white;border-color:#294eae}
.itemimg{width:100%;height:180px;object-fit:cover;border-radius:10px;background:#eef1f7}
.muted{color:#748096;font-size:13px}
.balance{font-size:35px;font-weight:900;color:#15976f}
.notice{padding:12px;border-radius:9px;background:#eef5ff;margin:12px 0}
.auth{max-width:430px;margin:65px auto}
@media(max-width:600px){.wrap{padding:13px}.hero{padding:25px 20px}.hero h1{font-size:27px}.nav{padding:13px}.panel{padding:16px}}
`;

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tab, setTab] = useState('home');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('기타');
  const [location, setLocation] = useState('');
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [photo, setPhoto] = useState<File | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
    else {
      setItems([]);
      setBalance(0);
      setTransactions([]);
    }
  }, [session]);

  async function loadData() {
    const { data: posts, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setItems(posts || []);

    const { data: profile } = await supabase
      .from('profiles')
      .select('fc_balance')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profile) setBalance(profile.fc_balance || 0);

    const { data: history } = await supabase
      .from('fc_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setTransactions(history || []);
  }

  async function authenticate() {
    setBusy(true);
    setMessage('');
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname } },
        });
        if (error) throw error;
        setMessage('가입 요청이 완료됐어요. 이메일 인증이 필요할 수 있습니다.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!title.trim() || !location.trim()) {
      setMessage('제목과 장소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      let imageUrl = null;
      if (photo) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(path, photo, { upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from('item-images')
          .getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('items').insert({
        user_id: session.user.id,
        item_type: itemType,
        title: title.trim(),
        description,
        category,
        location,
        image_url: imageUrl,
      });
      if (error) throw error;

      setTitle('');
      setDescription('');
      setLocation('');
      setPhoto(null);
      setMessage('게시글이 등록됐어요!');
      await loadData();
      setTab('board');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFC() {
    const value = Number(amount);
    if (!recipient.trim() || !Number.isSafeInteger(value) || value <= 0) {
      setMessage('받는 사람의 회원 ID와 올바른 송금 금액을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.rpc('transfer_fc', {
        recipient_id: recipient.trim(),
        transfer_amount: value,
      });
      if (error) throw error;
      setMessage('FC 송금이 완료됐어요!');
      setRecipient('');
      setAmount('');
      await loadData();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setTab('home');
  }

  const visibleItems = items.filter((item) => {
    const matchesType = filter === 'all' || item.item_type === filter;
    const term = search.toLowerCase();
    const matchesSearch = [
      item.title,
      item.description,
      item.location,
      item.category,
    ].some((v) => (v || '').toLowerCase().includes(term));
    return matchesType && matchesSearch;
  });

  if (!session)
    return (
      <>
        <style>{css}</style>
        <div className="auth panel">
          <div className="logo">
            Find<span>Coin</span>
          </div>
          <h2>{isSignup ? '회원가입' : '로그인'}</h2>
          <p className="muted">분실물을 찾고, FC를 적립해 보세요.</p>
          {isSignup && (
            <>
              <label>닉네임</label>
              <input
                className="field"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임"
              />
            </>
          )}
          <label>이메일</label>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
          />
          <label>비밀번호</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
          />
          <button
            className="btn"
            style={{ width: '100%' }}
            disabled={busy}
            onClick={authenticate}
          >
            {busy ? '처리 중...' : isSignup ? '회원가입' : '로그인'}
          </button>
          <p className="muted" style={{ textAlign: 'center' }}>
            {isSignup ? '이미 계정이 있나요?' : '계정이 없나요?'}
            <button
              className="btn light"
              onClick={() => {
                setIsSignup(!isSignup);
                setMessage('');
              }}
            >
              {isSignup ? '로그인' : '회원가입'}
            </button>
          </p>
          {message && <div className="notice">{message}</div>}
        </div>
      </>
    );

  return (
    <>
      <style>{css}</style>
      <header className="header">
        <div className="nav">
          <div className="logo">
            Find<span>Coin</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="muted">{session.user.email}</span>
            <button className="btn light" onClick={logout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <div className="muted" style={{ color: '#d7e3ff' }}>
            분실물 찾기 플랫폼
          </div>
          <h1>
            잃어버린 물건에
            <br />
            새로운 연결을.
          </h1>
          <p>
            분실물을 등록하고, 습득물을 공유하고,
            <br />
            서로 도우며 FC를 모아 보세요.
          </p>
          <button className="btn green" onClick={() => setTab('write')}>
            분실물 등록하기
          </button>
        </section>

        <section className="grid">
          <div className="panel">
            <div className="muted">내 FC 잔액</div>
            <div className="balance">{balance.toLocaleString()} FC</div>
            <button className="btn light" onClick={() => setTab('wallet')}>
              내 지갑 보기
            </button>
          </div>
          <div className="panel">
            <div className="muted">등록된 게시글</div>
            <div className="balance" style={{ color: '#294eae' }}>
              {items.length}개
            </div>
            <button className="btn light" onClick={() => setTab('board')}>
              게시판 보기
            </button>
          </div>
        </section>

        <nav className="tabs">
          {[
            ['home', '홈'],
            ['board', '게시판'],
            ['write', '글쓰기'],
            ['wallet', 'FC 지갑'],
          ].map(([id, name]) => (
            <button
              key={id}
              className={`tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </nav>

        {message && <div className="notice">{message}</div>}

        {tab === 'home' && (
          <section className="panel">
            <h2>FindCoin에 오신 것을 환영합니다!</h2>
            <p>잃어버린 물건을 찾거나, 주인을 기다리는 물건을 등록해 주세요.</p>
            <div className="grid">
              <button
                className="btn"
                onClick={() => {
                  setItemType('lost');
                  setTab('write');
                }}
              >
                분실물 등록
              </button>
              <button
                className="btn green"
                onClick={() => {
                  setItemType('found');
                  setTab('write');
                }}
              >
                습득물 등록
              </button>
            </div>
          </section>
        )}

        {tab === 'board' && (
          <section>
            <div className="panel">
              <h2>분실물 · 습득물 게시판</h2>
              <input
                className="field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="물건 이름, 장소, 종류 검색"
              />
              <div className="tabs">
                {[
                  ['all', '전체'],
                  ['lost', '분실물'],
                  ['found', '습득물'],
                ].map(([id, name]) => (
                  <button
                    key={id}
                    className={`tab ${filter === id ? 'active' : ''}`}
                    onClick={() => setFilter(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid">
              {visibleItems.map((item) => (
                <article className="panel" key={item.id}>
                  {item.image_url && (
                    <img
                    className="itemimg"
                    src={item.image_url}
                    alt={item.title}
                    onError={(e) => {
                      console.log('사진 불러오기 실패:', item.image_url);
                      console.log('오류 이미지:', e.currentTarget);
                    }}
                    onLoad={() => {
                      console.log('사진 불러오기 성공:', item.image_url);
                    }}
                  />
                  )}
                  <div style={{ marginTop: 12 }}>
                    <span className="muted">
                      {item.item_type === 'lost' ? '🔎 분실물' : '📦 습득물'} ·{' '}
                      {item.category}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <p className="muted">📍 {item.location}</p>
                    <p className="muted">
                      {new Date(item.created_at).toLocaleString('ko-KR')}
                    </p>
                    <span className="muted">
                      {item.status === 'open' ? '진행 중' : '해결됨'}
                    </span>
                    <div style={{ marginTop: 15 }}>
  <button
    className="btn"
    onClick={() => setSelectedItem(item)}
  >
    상세보기
  </button>
</div>
                  </div>
                </article>
              ))}
            </div>
            {visibleItems.length === 0 && (
              <div className="panel">등록된 게시글이 없습니다.</div>
            )}
          </section>
        )}

{selectedItem && (
  <section className="panel">
    <button
      className="btn light"
      onClick={() => setSelectedItem(null)}
    >
      ← 게시판으로 돌아가기
    </button>

    <h2>게시글 상세정보</h2>

    {selectedItem.image_url && (
      <img
        src={selectedItem.image_url}
        alt={selectedItem.title}
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: 400,
          objectFit: 'contain',
          borderRadius: 12
        }}
      />
    )}

    <h2>{selectedItem.title}</h2>

    <p>
      {selectedItem.item_type === 'lost'
        ? '🔎 분실물'
        : '📦 습득물'}
      {' · '}
      {selectedItem.category}
    </p>

    <div className="notice">
      <strong>상세 설명</strong>
      <p>{selectedItem.description || '설명이 없습니다.'}</p>
    </div>

    <p>📍 장소: {selectedItem.location}</p>

    <p>
      📅 등록일:{' '}
      {new Date(selectedItem.created_at).toLocaleString('ko-KR')}
    </p>

    <p>
      상태: {selectedItem.status === 'open'
        ? '진행 중'
        : '해결됨'}
    </p>
  </section>
)}

        {tab === 'write' && (
          <section className="panel">
            <h2>게시글 등록</h2>
            <label>등록 종류</label>
            <select
              className="field"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as any)}
            >
              <option value="lost">분실물</option>
              <option value="found">습득물</option>
            </select>
            <label>물건 이름</label>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 검은색 지갑"
            />
            <label>카테고리</label>
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                '전자기기',
                '지갑·카드',
                '가방',
                '의류',
                '귀중품',
                '서류',
                '기타',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <label>장소</label>
            <input
              className="field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 학교 도서관"
            />
            <label>상세 설명</label>
            <textarea
              className="field"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="물건의 특징과 발견 또는 분실 상황을 적어 주세요."
            />
            <label>사진 첨부</label>
            <input
              className="field"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
            {photo && <p className="muted">선택한 사진: {photo.name}</p>}
            <button className="btn" disabled={busy} onClick={createItem}>
              {busy ? '등록 중...' : '게시글 등록하기'}
            </button>
          </section>
        )}

        {tab === 'wallet' && (
          <section className="panel">
            <h2>내 FC 지갑</h2>
            <p className="muted">현재 보유 잔액</p>
            <div className="balance">{balance.toLocaleString()} FC</div>
            <div className="notice">
              회원 ID는 송금받을 사람의 UUID입니다. 이메일이나 비밀번호를
              입력하지 마세요.
            </div>
            <h3>FC 송금</h3>
            <label>받는 사람의 회원 ID (UUID)</label>
            <input
              className="field"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="회원 UUID"
            />
            <label>송금할 FC</label>
            <input
              className="field"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="송금 금액"
            />
            <button className="btn green" disabled={busy} onClick={sendFC}>
              FC 송금하기
            </button>
            <h3 style={{ marginTop: 30 }}>거래 내역</h3>
            {transactions.map((tx) => (
              <div key={tx.id} className="notice">
                <strong>
                  {tx.tx_type === 'transfer'
                    ? 'FC 거래'
                    : tx.tx_type === 'earn'
                    ? 'FC 적립'
                    : 'FC 사용'}
                </strong>
                <div>{tx.description || '거래 내역'}</div>
                <div>{tx.amount.toLocaleString()} FC</div>
                <div className="muted">
                  {new Date(tx.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="muted">아직 거래 내역이 없습니다.</p>
            )}
          </section>
        )}

        <footer className="muted" style={{ textAlign: 'center', padding: 30 }}>
          FindCoin · 함께 찾고 함께 나누는 서비스
        </footer>
      </main>
    </>
  );
}
