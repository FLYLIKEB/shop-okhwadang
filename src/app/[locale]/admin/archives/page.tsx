'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  adminArchivesApi,
  type NiloType,
  type ProcessStep,
  type Artist,
  type CreateNiloTypeData,
  type CreateProcessStepData,
  type CreateArtistData,
} from '@/lib/api';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';

type Tab = 'nilo' | 'process' | 'artist';

function NiloTypeRow({
  item,
  onEdit,
  onDelete,
}: {
  item: NiloType;
  onEdit: (n: NiloType) => void;
  onDelete: (n: NiloType) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <span
          className="inline-block w-6 h-6 rounded"
          style={{ backgroundColor: item.color }}
        />
      </td>
      <td className="py-3 px-4 font-medium">{item.nameKo}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.name}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{item.region}</td>
      <td className="py-3 px-4">
        <span className={item.isActive ? 'text-green-600' : 'text-muted-foreground'}>
          {item.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="text-sm hover:underline">수정</button>
          <button onClick={() => onDelete(item)} className="text-sm text-destructive hover:underline">삭제</button>
        </div>
      </td>
    </tr>
  );
}

function ProcessStepRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ProcessStep;
  onEdit: (p: ProcessStep) => void;
  onDelete: (p: ProcessStep) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
          {item.step}
        </span>
      </td>
      <td className="py-3 px-4 font-medium">{item.title}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="text-sm hover:underline">수정</button>
          <button onClick={() => onDelete(item)} className="text-sm text-destructive hover:underline">삭제</button>
        </div>
      </td>
    </tr>
  );
}

function ArtistRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Artist;
  onEdit: (a: Artist) => void;
  onDelete: (a: Artist) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
            {item.name.slice(0, 1)}
          </div>
        )}
      </td>
      <td className="py-3 px-4 font-medium">{item.name}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.title}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.region}</td>
      <td className="py-3 px-4">
        <span className={item.isActive ? 'text-green-600' : 'text-muted-foreground'}>
          {item.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="text-sm hover:underline">수정</button>
          <button onClick={() => onDelete(item)} className="text-sm text-destructive hover:underline">삭제</button>
        </div>
      </td>
    </tr>
  );
}

function NiloTypeFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateNiloTypeData) => Promise<void>;
  initial?: NiloType | null;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateNiloTypeData>({
    name: '',
    nameKo: '',
    color: '#8B4513',
    region: '',
    description: '',
    characteristics: [],
    productUrl: '',
    isActive: true,
  });
  const [characteristicsText, setCharacteristicsText] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        nameKo: initial.nameKo,
        color: initial.color,
        region: initial.region,
        description: initial.description,
        characteristics: initial.characteristics,
        productUrl: initial.productUrl,
        isActive: initial.isActive,
      });
      setCharacteristicsText(initial.characteristics.join(', '));
    } else {
      setForm({
        name: '',
        nameKo: '',
        color: '#8B4513',
        region: '',
        description: '',
        characteristics: [],
        productUrl: '',
        isActive: true,
      });
      setCharacteristicsText('');
    }
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...form,
        characteristics: characteristicsText.split(',').map((s) => s.trim()).filter(Boolean),
      };
      await onSubmit(data);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '니로타입 수정' : '니로타입 추가'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="이름 (中文)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="朱泥"
            required
          />
          <FormInput
            label="이름 (한글)"
            value={form.nameKo}
            onChange={(e) => setForm({ ...form, nameKo: e.target.value })}
            placeholder="주니"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">색상</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-10 h-10 rounded border border-input cursor-pointer"
            />
            <FormInput
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        <FormInput
          label="산지"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          placeholder="장쑤성 이싱 황룡산"
          required
        />
        <div>
          <label className="text-sm font-medium block mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            required
          />
        </div>
        <FormInput
          label="특성 (쉼표로 구분)"
          value={characteristicsText}
          onChange={(e) => setCharacteristicsText(e.target.value)}
          placeholder="철분 함량 14-16%, 소성 온도 1080-1120°C"
        />
        <FormInput
          label="상품 URL"
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
          placeholder="/products?clayType=주니"
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="niloIsActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="niloIsActive" className="text-sm">활성 상태</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProcessStepFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProcessStepData) => Promise<void>;
  initial?: ProcessStep | null;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateProcessStepData>({
    step: 1,
    title: '',
    description: '',
    detail: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        step: initial.step,
        title: initial.title,
        description: initial.description,
        detail: initial.detail,
      });
    } else {
      setForm({ step: 1, title: '', description: '', detail: '' });
    }
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '공정 수정' : '공정 추가'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="단계"
          type="number"
          min={1}
          value={form.step}
          onChange={(e) => setForm({ ...form, step: Number(e.target.value) })}
          required
        />
        <FormInput
          label="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="채토 (採土)"
          required
        />
        <FormInput
          label="간단 설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="산지에서 원토를 채굴"
          required
        />
        <div>
          <label className="text-sm font-medium block mb-1">상세 설명</label>
          <textarea
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ArtistFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArtistData) => Promise<void>;
  initial?: Artist | null;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateArtistData>({
    name: '',
    title: '',
    region: '',
    story: '',
    specialty: '',
    imageUrl: '',
    productUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        title: initial.title,
        region: initial.region,
        story: initial.story,
        specialty: initial.specialty,
        imageUrl: initial.imageUrl ?? '',
        productUrl: initial.productUrl,
        isActive: initial.isActive,
      });
    } else {
      setForm({ name: '', title: '', region: '', story: '', specialty: '', imageUrl: '', productUrl: '', isActive: true });
    }
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '아티스트 수정' : '아티스트 추가'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="진위명 (陳偉明)"
            required
          />
          <FormInput
            label="타이틀"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="국가급 공예미술사"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="지역"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="장쑤성 이싱"
            required
          />
          <FormInput
            label="전문"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            placeholder="이중 니층 석표식"
            required
          />
        </div>
        <FormInput
          label="이미지 URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://..."
        />
        <div>
          <label className="text-sm font-medium block mb-1">스토리</label>
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            required
          />
        </div>
        <FormInput
          label="상품 URL"
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
          placeholder="/products?artist=chen-weiming"
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="artistIsActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="artistIsActive" className="text-sm">활성 상태</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminArchivesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('nilo');
  const [niloTypes, setNiloTypes] = useState<NiloType[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const [niloModalOpen, setNiloModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [artistModalOpen, setArtistModalOpen] = useState(false);

  const [editNilo, setEditNilo] = useState<NiloType | null>(null);
  const [editProcess, setEditProcess] = useState<ProcessStep | null>(null);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nilos, processes, artistsData] = await Promise.all([
        adminArchivesApi.getNiloTypes(),
        adminArchivesApi.getProcessSteps(),
        adminArchivesApi.getArtists(),
      ]);
      setNiloTypes(nilos);
      setProcessSteps(processes);
      setArtists(artistsData);
    } catch {
      toast.error('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      loadData();
    }
  }, [user, loadData]);

  const handleNiloSubmit = async (data: CreateNiloTypeData) => {
    if (editNilo) {
      await adminArchivesApi.updateNiloType(editNilo.id, data);
      toast.success('니로타입이 수정되었습니다.');
    } else {
      await adminArchivesApi.createNiloType(data);
      toast.success('니로타입이 추가되었습니다.');
    }
    await loadData();
  };

  const handleProcessSubmit = async (data: CreateProcessStepData) => {
    if (editProcess) {
      await adminArchivesApi.updateProcessStep(editProcess.id, data);
      toast.success('공정이 수정되었습니다.');
    } else {
      await adminArchivesApi.createProcessStep(data);
      toast.success('공정이 추가되었습니다.');
    }
    await loadData();
  };

  const handleArtistSubmit = async (data: CreateArtistData) => {
    if (editArtist) {
      await adminArchivesApi.updateArtist(editArtist.id, data);
      toast.success('아티스트가 수정되었습니다.');
    } else {
      await adminArchivesApi.createArtist(data);
      toast.success('아티스트가 추가되었습니다.');
    }
    await loadData();
  };

  const handleDeleteNilo = async (item: NiloType) => {
    if (!window.confirm(`"${item.nameKo}" 니로타입을 삭제하시겠습니까?`)) return;
    try {
      await adminArchivesApi.deleteNiloType(item.id);
      toast.success('삭제되었습니다.');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const handleDeleteProcess = async (item: ProcessStep) => {
    if (!window.confirm(`"${item.title}" 공정을 삭제하시겠습니까?`)) return;
    try {
      await adminArchivesApi.deleteProcessStep(item.id);
      toast.success('삭제되었습니다.');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const handleDeleteArtist = async (item: Artist) => {
    if (!window.confirm(`"${item.name}" 아티스트를 삭제하시겠습니까?`)) return;
    try {
      await adminArchivesApi.deleteArtist(item.id);
      toast.success('삭제되었습니다.');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'nilo', label: '니로타입' },
    { key: 'process', label: '공정' },
    { key: 'artist', label: '아티스트' },
  ];

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonBox height="h-8 w-48" />
        <SkeletonBox height="h-12 w-full" />
        <SkeletonBox height="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">아카이브 관리</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'nilo' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditNilo(null); setNiloModalOpen(true); }}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
            >
              + 니로타입 추가
            </button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-3 px-4 w-16">색상</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4">원문</th>
                  <th className="py-3 px-4">산지</th>
                  <th className="py-3 px-4 w-20">상태</th>
                  <th className="py-3 px-4 w-28">작업</th>
                </tr>
              </thead>
              <tbody>
                {niloTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">데이터가 없습니다.</td>
                  </tr>
                ) : (
                  niloTypes.map((n) => (
                    <NiloTypeRow key={n.id} item={n} onEdit={(n) => { setEditNilo(n); setNiloModalOpen(true); }} onDelete={handleDeleteNilo} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'process' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditProcess(null); setProcessModalOpen(true); }}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
            >
              + 공정 추가
            </button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-3 px-4 w-16">단계</th>
                  <th className="py-3 px-4">제목</th>
                  <th className="py-3 px-4">설명</th>
                  <th className="py-3 px-4 w-28">작업</th>
                </tr>
              </thead>
              <tbody>
                {processSteps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">데이터가 없습니다.</td>
                  </tr>
                ) : (
                  processSteps.map((p) => (
                    <ProcessStepRow key={p.id} item={p} onEdit={(p) => { setEditProcess(p); setProcessModalOpen(true); }} onDelete={handleDeleteProcess} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'artist' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditArtist(null); setArtistModalOpen(true); }}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
            >
              + 아티스트 추가
            </button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-3 px-4 w-16">이미지</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4">타이틀</th>
                  <th className="py-3 px-4">지역</th>
                  <th className="py-3 px-4 w-20">상태</th>
                  <th className="py-3 px-4 w-28">작업</th>
                </tr>
              </thead>
              <tbody>
                {artists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">데이터가 없습니다.</td>
                  </tr>
                ) : (
                  artists.map((a) => (
                    <ArtistRow key={a.id} item={a} onEdit={(a) => { setEditArtist(a); setArtistModalOpen(true); }} onDelete={handleDeleteArtist} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NiloTypeFormModal
        open={niloModalOpen}
        onClose={() => setNiloModalOpen(false)}
        onSubmit={handleNiloSubmit}
        initial={editNilo}
      />
      <ProcessStepFormModal
        open={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        onSubmit={handleProcessSubmit}
        initial={editProcess}
      />
      <ArtistFormModal
        open={artistModalOpen}
        onClose={() => setArtistModalOpen(false)}
        onSubmit={handleArtistSubmit}
        initial={editArtist}
      />
    </div>
  );
}
