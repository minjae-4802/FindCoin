import { useEffect, useState } from 'react';
import { supabase } from './supabase';
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<any>;
    };
  }
}

const FC_CONTRACT = '0x237951a1143f67e5E03A6e0738EA7aF7bC91Bd83';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
type Item = {
  id: string;
  user_id: string;
  item_type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location: string;
  contact_email: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

const css =  `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f5f7fb;
  color: #18243b;
  font-family: Arial, "Noto Sans KR", sans-serif;
}

.wrap {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding-bottom: 60px;
}

.header {
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 18px 0;
}

.logo {
  color: #173b70;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: -1px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  border: 0;
  border-radius: 10px;
  padding: 11px 17px;
  background: #e9eef7;
  color: #243b5c;
  font-weight: 700;
  transition: 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.panel {
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 8px 28px rgba(30, 55, 90, 0.05);
}

.hero {
  margin: 24px 0;
  padding: 54px 46px;
  border-radius: 24px;
  background: linear-gradient(135deg, #173b70, #246b83);
  color: #fff;
  overflow: hidden;
}

.hero h1 {
  margin: 0 0 18px;
  font-size: clamp(30px, 5vw, 46px);
  line-height: 1.35;
  letter-spacing: -1.5px;
  font-weight: 800;
  word-break: keep-all;
}

.hero p {
  margin: 0;
  max-width: 620px;
  color: #e4edf7;
  font-size: 16px;
  line-height: 1.8;
  word-break: keep-all;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field input,
.field textarea,
.field select,
input,
textarea,
select {
  width: 100%;
  border: 1px solid #dce3ed;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
  color: #18243b;
  outline: none;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #287c91;
  box-shadow: 0 0 0 3px rgba(40, 124, 145, 0.12);
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.itemimg {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
  border-radius: 12px;
}

.muted {
  color: #78869a;
  font-size: 14px;
}

.balance {
  color: #16836e;
  font-weight: 800;
  font-size: 22px;
}

.notice {
  padding: 14px 16px;
  border-radius: 12px;
  background: #edf7f5;
  color: #176b60;
  line-height: 1.6;
}

.auth {
  max-width: 460px;
  margin: 30px auto;
}

button {
  cursor: pointer;
}

@media (max-width: 600px) {
  .wrap {
    width: calc(100% - 24px);
  }

  .hero {
    padding: 36px 24px;
  }

  .panel {
    padding: 18px;
  }

  .header {
    align-items: flex-start;
  }
}
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
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('기타');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [photo, setPhoto] = useState<File | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [chainBalance, setChainBalance] = useState('0');
  const [chainTransactions, setChainTransactions] = useState<any[]>([]);
  const [walletBusy, setWalletBusy] = useState(false);
  const [chainRecipient, setChainRecipient] = useState('');
  const [chainAmount, setChainAmount] = useState('');
  async function connectWallet() {
  if (!window.ethereum) {
    setMessage('MetaMask가 설치되어 있지 않습니다.');
    return;
  }

  setWalletBusy(true);
  setMessage('');

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('MetaMask 계정을 찾을 수 없습니다.');
    }

    let address = accounts[0];

    let chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    }

    const data =
      '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0');

    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: FC_CONTRACT,
          data,
        },
        'latest',
      ],
    });

    const rawBalance = BigInt(result);
    const wholeBalance = rawBalance / 10n ** 18n;
    const fraction = (rawBalance % 10n ** 18n)
      .toString()
      .padStart(18, '0')
      .slice(0, 4)
      .replace(/0+$/, '');

    setWalletAddress(address);
    setChainBalance(
      wholeBalance.toLocaleString() +
        (fraction ? '.' + fraction : '')
    );

    setMessage('MetaMask 지갑이 연결됐습니다!');
  } catch (error: any) {
    setMessage('지갑 연결 실패: ' + error.message);
  } finally {
    setWalletBusy(false);
  }
}
async function sendOnChainFC() {
  if (!window.ethereum) {
    setMessage('MetaMask를 설치해 주세요.');
    return;
  }

  if (!walletAddress) {
    setMessage('먼저 MetaMask 지갑을 연결해 주세요.');
    return;
  }

  if (!session?.user?.id) {
    setMessage('먼저 FindCoin에 로그인해 주세요.');
    return;
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(chainRecipient)) {
    setMessage('올바른 받는 사람 지갑 주소를 입력해 주세요.');
    return;
  }

  if (
    !/^\d+(\.\d{1,18})?$/.test(chainAmount) ||
    Number(chainAmount) <= 0
  ) {
    setMessage('올바른 FC 수량을 입력해 주세요.');
    return;
  }

  setWalletBusy(true);
  setMessage('');

  try {
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error('MetaMask 네트워크를 Sepolia로 변경해 주세요.');
    }

    const parts = chainAmount.split('.');
    const whole = BigInt(parts[0]);
    const fraction = BigInt(
      (parts[1] || '').padEnd(18, '0') || '0'
    );

    const tokenAmount = whole * 10n ** 18n + fraction;

    const addressData = chainRecipient
      .slice(2)
      .toLowerCase()
      .padStart(64, '0');

    const amountData = tokenAmount
      .toString(16)
      .padStart(64, '0');

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: FC_CONTRACT,
        data: '0xa9059cbb' + addressData + amountData,
      }],
    });

    const { data: savedTx, error: saveError } = await supabase
      .from('chain_transactions')
      .insert({
        user_id: session.user.id,
        sender_wallet: walletAddress,
        recipient_wallet: chainRecipient,
        amount: chainAmount,
        tx_hash: txHash,
        status: 'submitted',
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(
        '송금 요청은 접수됐지만 거래 내역 저장에 실패했습니다: ' +
        saveError.message
      );
    }

    setChainTransactions((prev) => [savedTx, ...prev]);

    setMessage('FC 송금 요청 및 거래 내역 저장 완료! 해시: ' + txHash);
    setChainAmount('');
    setChainRecipient('');

  } catch (error: any) {
    setMessage('FC 송금 처리 오류: ' + error.message);
  } finally {
    setWalletBusy(false);
  }
}
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
  }, [session,walletAddress]);

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

 const { data: chainHistory, error: chainError } = await supabase
    .from('chain_transactions')
    .select('*')
    .or(
      `sender_wallet.ilike.${walletAddress},recipient_wallet.ilike.${walletAddress}`
    )
    .order('created_at', { ascending: false });

 if (chainError) {
  setMessage('블록체인 거래 내역 불러오기 실패: ' + chainError.message);
} else {
  setChainTransactions(chainHistory || []);
}
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
  contact_email: contactEmail.trim() || null,
  image_url: imageUrl,
});
      if (error) throw error;

      setTitle('');
      setDescription('');
      setLocation('');
      setContactEmail('');
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

async function startEdit(item: Item) {
  if (item.user_id !== session.user.id) {
    setMessage('본인이 작성한 게시글만 수정할 수 있습니다.');
    return;
  }

  setEditingItem(item);
  setTitle(item.title);
  setDescription(item.description || '');
  setCategory(item.category);
  setLocation(item.location);
  setContactEmail(item.contact_email || '');
  setItemType(item.item_type);
  setPhoto(null);
  setSelectedItem(null);
  setMessage('');
  setTab('write');
}

async function updateItem() {
  if (!editingItem) return;

  if (!title.trim() || !location.trim()) {
    setMessage('제목과 장소를 입력해 주세요.');
    return;
  }

  setBusy(true);
  setMessage('');

  try {
    let imageUrl = editingItem.image_url;

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

    const { error } = await supabase
      .from('items')
      .update({
        item_type: itemType,
        title: title.trim(),
        description,
        category,
        location,
        contact_email: contactEmail.trim() || null,
        image_url: imageUrl,
      })
      .eq('id', editingItem.id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    setEditingItem(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setContactEmail('');
    setCategory('기타');
    setItemType('lost');
    setPhoto(null);
    setMessage('게시글이 수정됐어요!');

    await loadData();
    setTab('board');
  } catch (e: any) {
    setMessage('수정 실패: ' + e.message);
  } finally {
    setBusy(false);
  }
}

async function deleteItem(item: Item) {
  if (item.user_id !== session.user.id) {
    setMessage('본인이 작성한 게시글만 삭제할 수 있습니다.');
    return;
  }

  const confirmed = window.confirm(
    '정말 이 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.'
  );

  if (!confirmed) return;

  setBusy(true);
  setMessage('');

  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    setSelectedItem(null);
    setMessage('게시글이 삭제됐어요!');

    await loadData();
  } catch (e: any) {
    setMessage('삭제 실패: ' + e.message);
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

<button
  className="btn green"
  disabled={walletBusy}
  onClick={connectWallet}
>
  {walletBusy
    ? '연결 중...'
    : walletAddress
    ? '지갑 연결 완료'
    : 'MetaMask 연결'}
</button>

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
            <div className="balance">
  {walletAddress ? `${chainBalance} ` : balance.toLocaleString()} FC
</div>
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
                    
<div style={{ marginTop: 15, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  <button
    className="btn"
    onClick={() => setSelectedItem(item)}
  >
    상세보기
  </button>

  {item.user_id === session.user.id && (
    <>
      <button
        className="btn light"
        disabled={busy}
        onClick={() => startEdit(item)}
      >
        수정
      </button>

      <button
        className="btn red"
        disabled={busy}
        onClick={() => deleteItem(item)}
      >
        삭제
      </button>
    </>
  )}
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
  📧 연락 이메일:{' '}
  {selectedItem.contact_email ? (
    <a href={`mailto:${selectedItem.contact_email}`}>
      {selectedItem.contact_email}
    </a>
  ) : '등록된 이메일이 없습니다.'}
</p>
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
            <h2>{editingItem ? '게시글 수정' : '게시글 등록'}</h2>
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
            <label>연락받을 이메일</label>
<input
  className="field"
  type="email"
  value={contactEmail}
  onChange={(e) => setContactEmail(e.target.value)}
  placeholder="연락받을 이메일 주소"
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
           <button
  className="btn"
  disabled={busy}
  onClick={editingItem ? updateItem : createItem}
>
  {busy
    ? '처리 중...'
    : editingItem
    ? '수정 완료'
    : '게시글 등록하기'}
</button>

{editingItem && (
  <button
    className="btn light"
    style={{ marginLeft: 8 }}
    onClick={() => {
      setEditingItem(null);
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('기타');
      setItemType('lost');
      setPhoto(null);
      setTab('board');
      setMessage('');
    }}
  >
    취소
  </button>
)}
          </section>
        )}

        {tab === 'wallet' && (
          <section className="panel">
            <h2>내 FC 지갑</h2>
            <p className="muted">현재 보유 잔액</p>
            <div className="balance">{chainBalance || '0'} FC</div>
            <div className="notice">
  <strong>블록체인 지갑</strong>

  <p>
    {walletAddress
      ? `연결 주소: ${walletAddress}`
      : '아직 MetaMask가 연결되지 않았습니다.'}
  </p>

  <p>
    실제 보유 FC: {chainBalance} FC
  </p>
<h3>블록체인 FC 송금</h3>

<label>받는 사람의 MetaMask 주소</label>
<input
  className="field"
  value={chainRecipient}
  onChange={(e) => setChainRecipient(e.target.value)}
  placeholder="0x로 시작하는 지갑 주소"
/>

<label>송금할 FC 수량</label>
<input
  className="field"
  type="number"
  min="0"
  step="0.000000000000000001"
  value={chainAmount}
  onChange={(e) => setChainAmount(e.target.value)}
  placeholder="예: 100"
/>

<button
  className="btn green"
  disabled={walletBusy || !walletAddress}
  onClick={sendOnChainFC}
>
  {walletBusy ? '처리 중...' : '블록체인 FC 송금하기'}
</button>
  {!walletAddress && (
    <button className="btn green" onClick={connectWallet}>
      MetaMask 연결하기
    </button>
  )}
</div>
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
                <div>{Number(tx.amount).toLocaleString()} FC</div>
                <div className="muted">
                  {new Date(tx.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="muted">아직 거래 내역이 없습니다.</p>
            )}
            
  <div className="notice">
  <h3>블록체인 거래 내역</h3>
  {chainTransactions.length === 0 ? (
    <p className="muted">아직 블록체인 거래 내역이 없습니다.</p>
  ) : (
    chainTransactions.map((tx) => (
      <div key={tx.id} className="notice">
        <strong>FC 블록체인 송금</strong>
        <div>보낸 금액: {Number(tx.amount).toLocaleString()} FC</div>
        <div>받는 지갑: {tx.recipient_wallet}</div>
        <div className="muted">
          {new Date(tx.created_at).toLocaleString('ko-KR')}
        </div>
        <div className="muted">상태: {tx.status}</div>
        <div className="muted">거래 해시: {tx.tx_hash}</div>
      </div>
    ))
  )}
</div>
          </section>
        )}

        <footer className="muted" style={{ textAlign: 'center', padding: 30 }}>
          FindCoin · 함께 찾고 함께 나누는 서비스
        </footer>
      </main>
    </>
  );
}
