'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  AlertTriangle,
  Check,
  Crown,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Link as LinkIcon,
  LogOutIcon,
  RefreshCw,
  Search,
  Shield,
  User,
  UserX,
  Users,
} from 'lucide-react'
import { Avatar, Button, Card, Dialog, Divider, FormField, IconButton, Input, Tabs, Tag, Tooltip, ValidatedInput } from '@/components/ui'
import { useToast } from '@/components/ui/ToastProvider'
import { CropDialog, useImageCropFlow } from '@/components/ImageCropFlow'
import { MyLobbiesCard } from '@/components/MyLobbiesCard'
import { postJson, requestJson } from '@/lib/api'
import { defaultTeamCode, isValidTeamCode, normalizeTeamName } from '@/lib/team'
import { RIOT_SERVERS, regionForServer, type RiotServer } from '@/api/riot/account'

interface TeamMember {
  id: string
  displayName: string
  photoURL: string | null
  isManager: boolean
}

interface ProfileAppProps {
  displayName: string
  username: string
  email: string
  photoURL?: string | null
  isTeamManager?: boolean
  teamName?: string | null
  teamCode?: string | null
  teamLogoURL?: string | null
  members?: TeamMember[]
  currentUserId?: string
  riot?: RiotAccountData | null
}

function ProfileHeader({
  tab,
  setTab,
  displayName,
  email,
  photoURL,
  teamName,
  teamCode,
  onSignOut,
}: {
  tab: string
  setTab: (t: string) => void
  displayName: string
  email: string
  photoURL?: string | null
  teamName: string | null
  teamCode: string | null
  onSignOut: () => void
}) {
  return (
    <div className="relative bg-ink-1000">
      <div className="relative h-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(-32deg, transparent 0 110px, var(--color-gold-500) 110px 132px)',
            opacity: 0.4,
            maskImage: 'linear-gradient(90deg, transparent 80%, black 92%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 80%, black 92%)',
          }}
        />
      </div>
      <div className="-mt-11 flex items-end gap-5 px-8">
        <Avatar
          src={photoURL}
          name={displayName}
          size="xl"
          className="rounded-[18px] shadow-[0_0_0_2px_rgba(255,255,255,0.18),0_0_0_4px_var(--color-ink-1000)]"
        />
        <div className="min-w-0 flex-1 pb-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {teamCode ? (
              <Tag scheme="brand" size="sm" className="italic">
                {teamCode}
              </Tag>
            ) : null}
            <span className="font-display text-2xl font-extrabold tracking-[-0.01em] text-white">{displayName}</span>
            {!teamName ? (
              <Tag scheme="neutral" size="sm">
                No team yet
              </Tag>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-white/60">{email}</p>
        </div>
        <Tooltip label="Sign out">
          <IconButton
            icon={<LogOut size={18} />}
            variant="subtle"
            aria-label="Sign out"
            className="mb-3.5 hidden text-white sm:inline-flex"
            onClick={onSignOut}
          />
        </Tooltip>
      </div>
      <div className="px-8 pt-5">
        <Tabs tabs={['Overview', 'Squad', 'Settings']} value={tab} onChange={setTab} />
      </div>
    </div>
  )
}

function EmptyRow({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-9 text-center">
      {icon}
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="max-w-80 text-[13px] text-white/60">{hint}</span>
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <MyLobbiesCard />
    </div>
  )
}

function SquadTab({
  isTeamManager,
  teamName,
  teamCode,
  teamLogoURL,
  members,
  currentUserId,
  onTeamSaved,
  onLeftTeam,
  onMemberKicked,
  onMemberPromoted,
}: {
  isTeamManager: boolean
  teamName: string | null
  teamCode: string | null
  teamLogoURL: string | null
  members: TeamMember[]
  currentUserId: string
  onTeamSaved: (name: string, code: string, logoURL: string | null) => void
  onLeftTeam: () => void
  onMemberKicked: (memberId: string) => void
  onMemberPromoted: (memberId: string) => void
}) {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const hasTeam = Boolean(teamName)

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <Card tone="arena" className="p-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// Team'}</span>
          {!hasTeam ? (
            <Button variant="primary" size="sm" iconLeft={<Plus size={16} />} onClick={() => setTeamDialogOpen(true)}>
              Create team
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              {isTeamManager ? (
                <>
                  <Tooltip label="Edit team">
                    <IconButton
                      icon={<Pencil size={16} />}
                      variant="subtle"
                      aria-label="Edit team"
                      className="text-white"
                      onClick={() => setTeamDialogOpen(true)}
                    />
                  </Tooltip>
                  <InviteRosterButton />
                </>
              ) : null}
              <Tooltip label="Leave team">
                <IconButton
                  icon={<LogOutIcon size={16} />}
                  variant="subtle"
                  aria-label="Leave team"
                  className="text-white"
                  onClick={() => setLeaveOpen(true)}
                />
              </Tooltip>
            </div>
          )}
        </div>
        <Divider className="mt-3" />
        {hasTeam ? (
          <div className="flex items-center gap-4 px-1 py-5">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-ink-700 overflow-hidden">
              {teamLogoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamLogoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/clover-mark.png" alt="" className="h-8 w-8 opacity-85" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold uppercase text-white">{teamName}</span>
                {isTeamManager ? (
                  <Tag scheme="brand" size="sm">
                    Manager
                  </Tag>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-white/60">
                {isTeamManager ? "You manage this squad's roster and settings." : "You're a member of this squad."}
              </p>
            </div>
          </div>
        ) : (
          <EmptyRow
            icon={<Shield size={26} className="text-white/50" />}
            title="Not on a roster yet"
            hint="Create a squad to show your team badge, role, and teammates here."
          />
        )}
      </Card>

      <MembersCard
        hasTeam={hasTeam}
        members={members}
        isTeamManager={isTeamManager}
        currentUserId={currentUserId}
        onMemberKicked={onMemberKicked}
        onMemberPromoted={onMemberPromoted}
      />

      <TeamDialog
        open={teamDialogOpen}
        onClose={() => setTeamDialogOpen(false)}
        onSaved={onTeamSaved}
        initial={hasTeam ? { name: teamName!, code: teamCode ?? '', logoURL: teamLogoURL } : null}
      />

      <LeaveTeamDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        isTeamManager={isTeamManager}
        members={members}
        currentUserId={currentUserId}
        onLeft={() => {
          setLeaveOpen(false)
          onLeftTeam()
        }}
      />
    </div>
  )
}

function MembersCard({
  hasTeam,
  members,
  isTeamManager,
  currentUserId,
  onMemberKicked,
  onMemberPromoted,
}: {
  hasTeam: boolean
  members: TeamMember[]
  isTeamManager: boolean
  currentUserId: string
  onMemberKicked: (memberId: string) => void
  onMemberPromoted: (memberId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [promoteTarget, setPromoteTarget] = useState<TeamMember | null>(null)

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.isManager !== b.isManager) return a.isManager ? -1 : 1
      return a.displayName.localeCompare(b.displayName)
    })
  }, [members])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedMembers
    return sortedMembers.filter((m) => m.displayName.toLowerCase().includes(q))
  }, [sortedMembers, query])

  return (
    <Card tone="arena" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// Roster'}</span>
        {hasTeam && members.length > 1 ? (
          <div className="relative w-40 shrink-0 sm:w-52">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members"
              className="h-8 w-full rounded-[8px] border border-white/10 bg-ink-900 pl-8 pr-2.5 text-xs text-white placeholder:text-white/40 focus:border-gold-500/60 focus:outline-none"
            />
          </div>
        ) : null}
      </div>
      <Divider className="mt-3" />
      {hasTeam && filteredMembers.length > 0 ? (
        <div className="flex flex-col gap-1 py-1">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3.5 rounded-[10px] border px-3 py-4.5 ${
                member.id === currentUserId ? 'border-gold-500/40 bg-gold-500/5' : 'border-transparent'
              }`}
            >
              <Avatar src={member.photoURL} name={member.displayName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{member.displayName}</div>
                <div className="text-[13px] text-white/60">{member.isManager ? 'Manager' : 'Member'}</div>
              </div>
              {isTeamManager && member.id !== currentUserId ? (
                <div className="flex items-center gap-1">
                  <Tooltip label="Make manager">
                    <IconButton
                      icon={<Crown size={16} />}
                      variant="subtle"
                      aria-label={`Make ${member.displayName} manager`}
                      className="text-white/60 hover:text-gold-500"
                      onClick={() => setPromoteTarget(member)}
                    />
                  </Tooltip>
                  <Tooltip label="Remove from team">
                    <IconButton
                      icon={<UserX size={16} />}
                      variant="subtle"
                      aria-label={`Remove ${member.displayName}`}
                      className="text-white/60 hover:text-red-400"
                      onClick={() => onMemberKicked(member.id)}
                    />
                  </Tooltip>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : hasTeam && members.length > 0 ? (
        <EmptyRow icon={<Search size={26} className="text-white/50" />} title="No matches" hint="Try a different search term." />
      ) : (
        <EmptyRow icon={<Users size={26} className="text-white/50" />} title="No members yet" hint="Invite teammates once your squad is set up." />
      )}

      <Dialog
        open={Boolean(promoteTarget)}
        title="Make manager?"
        onClose={() => setPromoteTarget(null)}
        actions={
          <>
            <Button variant="subtle" className="text-white" onClick={() => setPromoteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (promoteTarget) onMemberPromoted(promoteTarget.id)
                setPromoteTarget(null)
              }}
            >
              Make manager
            </Button>
          </>
        }
      >
        <strong className="text-white">{promoteTarget?.displayName}</strong>{' '}
        will become the manager of this team, and you&apos;ll become a regular member.
      </Dialog>
    </Card>
  )
}

function LeaveTeamDialog({
  open,
  onClose,
  isTeamManager,
  members,
  currentUserId,
  onLeft,
}: {
  open: boolean
  onClose: () => void
  isTeamManager: boolean
  members: TeamMember[]
  currentUserId: string
  onLeft: () => void
}) {
  const { showToast } = useToast()
  const [newOwnerId, setNewOwnerId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const otherMembers = members.filter((m) => m.id !== currentUserId)
  const needsSuccessor = isTeamManager && otherMembers.length > 0

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setNewOwnerId(otherMembers[0]?.id ?? '')
      setError(null)
    }
  }

  const handleLeave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await postJson<{ teamClosed: boolean; teamName: string }>(
        '/api/teams/leave',
        needsSuccessor ? { newOwnerId } : {},
        'Failed to leave team',
      )
      showToast({
        type: 'positive',
        title: 'Left team',
        message: data.teamClosed
          ? `${data.teamName} is now closed since no one else was on it.`
          : `You left ${data.teamName}.`,
      })
      onLeft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Leave team?"
      onClose={saving ? undefined : onClose}
      actions={
        <>
          <Button variant="subtle" className="text-white" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving || (needsSuccessor && !newOwnerId)} onClick={handleLeave}>
            {saving ? 'Leaving…' : 'Leave team'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {needsSuccessor ? (
          <>
            <p className="text-sm text-white/70">
              You&apos;re the manager. Pick a teammate to take over before you leave.
            </p>
            <div className="flex flex-col gap-2">
              {otherMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-white/10 px-3 py-2.5 hover:border-gold-500/50"
                >
                  <input
                    type="radio"
                    name="new-owner"
                    checked={newOwnerId === member.id}
                    onChange={() => setNewOwnerId(member.id)}
                  />
                  <Avatar src={member.photoURL} name={member.displayName} size="sm" />
                  <span className="text-sm text-white">{member.displayName}</span>
                </label>
              ))}
            </div>
          </>
        ) : isTeamManager ? (
          <p className="text-sm text-white/70">
            You&apos;re the only one on this team. Leaving will close the team — its invite link will stop working, but the team record stays.
          </p>
        ) : (
          <p className="text-sm text-white/70">You&apos;ll lose access to this team&apos;s roster and invites.</p>
        )}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </Dialog>
  )
}

type InviteState = 'idle' | 'loading' | 'copied' | 'error'

function InviteRosterButton() {
  const { showToast } = useToast()
  const [state, setState] = useState<InviteState>('idle')

  const handleInvite = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      const data = await postJson<{ inviteUrl: string }>('/api/teams/invite', undefined, 'Failed to create invite link')

      await navigator.clipboard.writeText(data.inviteUrl)
      showToast({
        type: 'info',
        title: 'Invite link copied',
        message: 'This link works for 7 days — share it with your teammate.',
      })
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      setState('error')
      showToast({
        type: 'danger',
        title: 'Could not create invite',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
      setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <Tooltip label={state === 'copied' ? 'Copied!' : 'Invite roster'}>
      <IconButton
        icon={state === 'copied' ? <Check size={16} className="text-gold-500" /> : <LinkIcon size={16} />}
        variant="subtle"
        aria-label="Invite roster"
        className="text-white"
        onClick={handleInvite}
        disabled={state === 'loading'}
      />
    </Tooltip>
  )
}

interface TeamDialogInitial {
  name: string
  code: string
  logoURL: string | null
}

function TeamDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSaved: (name: string, code: string, logoURL: string | null) => void
  initial: TeamDialogInitial | null
}) {
  const isEdit = Boolean(initial)
  const { showToast } = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [codeFocused, setCodeFocused] = useState(false)
  const logo = useImageCropFlow(initial?.logoURL ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameCheck = normalizeTeamName(name)
  const nameValid = 'value' in nameCheck

  const suggestedCode = useMemo(() => (nameValid ? defaultTeamCode(nameCheck.value) : ''), [nameValid, nameCheck])
  // While the field is empty and not focused, display the auto-generated suggestion; typing or
  // focusing it shows exactly what the user entered, with no suggestion filled in behind their back.
  const effectiveCode = !code && !codeFocused ? suggestedCode : code
  const codeValid = /^[A-Z0-9]{2}$/.test(effectiveCode)
  const canSubmit = nameValid && codeValid && !saving

  const reset = () => {
    setName(initial?.name ?? '')
    setCode(initial?.code ?? '')
    setCodeFocused(false)
    logo.reset(initial?.logoURL ?? null)
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset()
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const finalName = nameValid ? nameCheck.value : name
    try {
      await requestJson('/api/teams', {
        method: isEdit ? 'PATCH' : 'POST',
        body: { name: finalName, code: effectiveCode, logoDataUrl: logo.image },
        fallbackError: `Failed to ${isEdit ? 'save' : 'create'} team`,
      })
      onSaved(finalName, effectiveCode, logo.image)
      showToast({
        type: 'positive',
        title: isEdit ? 'Team updated' : 'Team created',
        message: isEdit ? `${finalName} has been updated.` : `${finalName} is ready.`,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? 'save' : 'create'} team`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={isEdit ? 'Edit your team' : 'Create your team'}
      onClose={saving ? undefined : handleClose}
      closeOnBackdropClick={false}
      className="max-w-[500px]"
      actions={
        <>
          <Button variant="subtle" className="text-white" disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Team logo" hint="Upload an image, then crop it to a square.">
          {logo.image ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.image} alt="" className="h-16 w-16 rounded-[14px] object-cover" />
              <button
                type="button"
                onClick={() => logo.setCropOpen(true)}
                className="text-xs text-gold-500 underline-offset-2 hover:underline"
              >
                Edit crop
              </button>
              <button
                type="button"
                onClick={() => logo.setImage(null)}
                className="text-xs text-white/50 underline-offset-2 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex h-[100px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/20 bg-ink-900 text-sm text-white/60 hover:border-gold-500/60">
              <span>Click to upload an image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => logo.handleFile(e.target.files?.[0])}
              />
            </label>
          )}
        </FormField>

        <ValidatedInput
          label="Team name"
          value={name}
          onChange={setName}
          validate={(v) => {
            const check = normalizeTeamName(v)
            return 'error' in check ? check.error : null
          }}
          hint="3–24 characters: letters, numbers, spaces, _ and -."
          placeholder="e.g. Night Owls"
        />

        <ValidatedInput
          label="Team code"
          value={effectiveCode}
          onChange={setCode}
          onFocus={() => setCodeFocused(true)}
          onBlur={() => setCodeFocused(false)}
          transform={(v) => v.toUpperCase()}
          validate={(v) => (!code || isValidTeamCode(v) ? null : 'Team code must be exactly 2 characters (0-9, A-Z).')}
          hint="Exactly 2 characters: 0-9 and uppercase A-Z. Auto-filled from the team name if left blank."
          placeholder="AB"
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <CropDialog
        open={logo.cropOpen}
        src={logo.rawImage ?? logo.image}
        pendingCrop={logo.pendingCrop}
        onChange={logo.setPendingCrop}
        onCancel={logo.handleCropCancel}
        onDone={logo.handleCropDone}
      />
    </Dialog>
  )
}

function SettingsTab({
  displayName,
  username,
  email,
  photoURL,
  onSaved,
  riot,
  onRiotSaved,
}: {
  displayName: string
  username: string
  email: string
  photoURL?: string | null
  onSaved: (displayName: string, photoURL: string | null) => void
  riot: RiotAccountData | null
  onRiotSaved: (riot: RiotAccountData | null) => void
}) {
  const { showToast } = useToast()
  const [draftName, setDraftName] = useState(displayName)
  const [removePhoto, setRemovePhoto] = useState(false)
  const photo = useImageCropFlow(photoURL ?? null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const nameChanged = draftName.trim().length > 0 && draftName.trim() !== displayName
  const photoChanged = removePhoto || photo.image !== (photoURL ?? null)
  const hasChanges = nameChanged || photoChanged

  const handlePhotoCropDone = () => {
    if (photo.pendingCrop) setRemovePhoto(false)
    photo.handleCropDone()
  }

  const handleRemovePhoto = () => {
    photo.setImage(null)
    setRemovePhoto(true)
  }

  const handleConfirmSave = async () => {
    setSaving(true)
    try {
      const trimmed = draftName.trim()
      await requestJson('/api/profile/me', {
        method: 'PATCH',
        body: {
          displayName: trimmed,
          ...(removePhoto ? { removePhoto: true } : photo.image !== (photoURL ?? null) ? { photoDataUrl: photo.image } : {}),
        },
        fallbackError: 'Failed to save',
      })
      onSaved(trimmed, removePhoto ? null : photo.image)
      setRemovePhoto(false)
      showToast({ type: 'positive', title: 'Profile updated', message: 'Your changes have been saved.' })
    } catch {
      showToast({ type: 'danger', title: 'Update failed', message: 'Something went wrong. Please try again.' })
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-5">
      <Card tone="arena" className="p-6">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// Account'}</span>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="order-2 flex flex-1 flex-col gap-4 sm:order-1">
            <FormField label="Display name" htmlFor="p-name">
              <Input id="p-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Add your player name" />
            </FormField>
            <FormField label="Player name" hint="Your username can't be changed." htmlFor="p-username">
              <Input id="p-username" value={username} iconLeft={<User size={16} />} disabled readOnly />
            </FormField>
          </div>
          <div className="order-1 flex shrink-0 flex-col items-center gap-1.5 sm:order-2">
            <label className="group relative flex h-[120px] w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-[14px] bg-ink-700">
              {photo.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.image} alt="" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/clover-mark.png" alt="" className="h-[55%] w-[55%] opacity-85" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100">
                <Pencil size={24} className="text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => photo.handleFile(e.target.files?.[0])}
              />
            </label>
            {photo.image ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[11px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <FormField label="Email" hint="Signed in with Google — this is the address you log in with." htmlFor="p-email">
            <Input
              id="p-email"
              type="email"
              value={email}
              placeholder="you@gmail.com"
              iconLeft={<Mail size={16} />}
              disabled
              readOnly
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="primary" disabled={!hasChanges} onClick={() => setConfirmOpen(true)}>
          Save changes
        </Button>
      </div>

      <RiotAccountCard riot={riot} onSaved={onRiotSaved} />

      <Dialog
        open={confirmOpen}
        title="Save changes?"
        onClose={saving ? undefined : () => setConfirmOpen(false)}
        actions={
          <>
            <Button variant="subtle" className="text-white" disabled={saving} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={handleConfirmSave}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          {nameChanged ? (
            <p>
              Your display name will change to <strong className="text-white">{draftName.trim()}</strong>.
            </p>
          ) : null}
          {photoChanged ? (
            <p>{removePhoto ? 'Your profile photo will revert to the default.' : 'Your profile photo will be updated.'}</p>
          ) : null}
        </div>
      </Dialog>

      <CropDialog
        open={photo.cropOpen}
        src={photo.rawImage}
        pendingCrop={photo.pendingCrop}
        onChange={photo.setPendingCrop}
        onCancel={photo.handleCropCancel}
        onDone={handlePhotoCropDone}
      />
    </div>
  )
}

interface RiotAccountData {
  gameName: string
  tagLine: string
  server: string
  tier: string | null
  rank: string | null
  lp: number | null
  verified: boolean
  iconURL: string | null
  companionIconURL?: string | null
  lastCheckedAt?: string | null
}

const SORTED_RIOT_SERVERS = [...RIOT_SERVERS].sort((a, b) => a.label.localeCompare(b.label))
const REFRESH_COOLDOWN_MS = (Number(process.env.NEXT_PUBLIC_RIOT_REFRESH_COOLDOWN_SECONDS) || 180) * 1000

function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function ServerSelect({ value, onChange }: { value: RiotServer; onChange: (server: RiotServer) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = SORTED_RIOT_SERVERS.filter((s) => s.label.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = SORTED_RIOT_SERVERS.find((s) => s.value === value)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-[10px] border border-white/15 bg-ink-900 px-3.5 text-sm text-white hover:border-white/25"
      >
        {selected?.label ?? value}
        <span className="text-white/40">▾</span>
      </button>
      {open ? (
        <div className="absolute bottom-full z-10 mb-1.5 w-full overflow-hidden rounded-[10px] border border-white/10 bg-ink-900 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/10 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search server"
              className="h-8 w-full rounded-[8px] border border-white/10 bg-ink-800 px-2.5 text-xs text-white placeholder:text-white/40 focus:border-gold-500/60 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onChange(s.value)
                  setOpen(false)
                  setQuery('')
                }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-sm hover:bg-white/10 ${
                  s.value === value ? 'text-gold-500' : 'text-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
            {filtered.length === 0 ? <div className="px-3.5 py-2 text-sm text-white/40">No matches</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RiotAccountCard({ riot, onSaved }: { riot: RiotAccountData | null; onSaved: (riot: RiotAccountData | null) => void }) {
  const { showToast } = useToast()
  const [linkOpen, setLinkOpen] = useState(false)
  const [gameNameInput, setGameNameInput] = useState('')
  const [tagLineInput, setTagLineInput] = useState('')
  const [server, setServer] = useState<RiotServer>('LAN')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(
    riot?.lastCheckedAt ? new Date(riot.lastCheckedAt).getTime() : null,
  )
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0)

  useEffect(() => {
    if (lastRefreshedAt === null) return
    const tick = () => setCooldownRemainingMs(Math.max(0, REFRESH_COOLDOWN_MS - (Date.now() - lastRefreshedAt)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lastRefreshedAt])

  const handleLink = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await postJson<{ riot: RiotAccountData }>(
        '/api/profile/riot',
        { riotId: `${gameNameInput.trim()}#${tagLineInput.trim()}`, server },
        'Failed to link Riot account',
      )
      onSaved(data.riot)
      setLastRefreshedAt(Date.now())
      setLinkOpen(false)
      setGameNameInput('')
      setTagLineInput('')
      showToast({
        type: data.riot.verified ? 'positive' : 'info',
        title: data.riot.verified ? 'Riot account linked' : 'Saved, but not verified yet',
        message: data.riot.verified
          ? `Linked to ${data.riot.gameName}#${data.riot.tagLine}.`
          : "We couldn't reach Riot's servers right now — we'll keep trying quietly and update this once it's verified.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link Riot account')
    } finally {
      setSaving(false)
    }
  }

  const effectiveCooldownMs = riot?.verified === false ? 0 : cooldownRemainingMs

  const handleRefresh = async () => {
    if (effectiveCooldownMs > 0 || refreshing) return
    setRefreshing(true)
    try {
      const data = await requestJson<{ riot: RiotAccountData }>('/api/profile/riot', {
        method: 'PATCH',
        fallbackError: 'Failed to refresh Riot account',
      })
      onSaved(data.riot)
      setLastRefreshedAt(Date.now())
      showToast({ type: 'positive', title: 'Riot account refreshed', message: 'Latest rank and profile icon pulled in.' })
    } catch {
      // Cooldown/refresh failures are silent — the button's disabled state already communicates this.
    } finally {
      setRefreshing(false)
    }
  }

  const gameNameValid = /^[0-9\p{L} ]{3,16}$/u.test(gameNameInput.trim())
  const tagLineValid = /^[0-9A-Za-z]{3,5}$/.test(tagLineInput.trim())
  const riotIdValid = gameNameValid && tagLineValid

  return (
    <Card tone="arena" className="p-6">
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">{'// Riot account'}</span>
        {riot ? (
          <div className="flex items-center gap-1.5">
            {effectiveCooldownMs > 0 ? (
              <span className="font-mono text-xs text-white/40">{formatCooldown(effectiveCooldownMs)}</span>
            ) : null}
            {effectiveCooldownMs > 0 ? (
              <IconButton
                icon={<RefreshCw size={16} />}
                variant="subtle"
                aria-label="Refresh Riot account"
                className="text-white"
                disabled
              />
            ) : (
              <Tooltip label="Refresh">
                <IconButton
                  icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} />}
                  variant="subtle"
                  aria-label="Refresh Riot account"
                  className="text-white"
                  disabled={refreshing}
                  onClick={handleRefresh}
                />
              </Tooltip>
            )}
            <Tooltip label="Edit">
              <IconButton
                icon={<Pencil size={16} />}
                variant="subtle"
                aria-label="Edit Riot account"
                className="text-white/60 hover:text-white"
                onClick={() => {
                  setGameNameInput(riot.gameName)
                  setTagLineInput(riot.tagLine)
                  setServer(riot.server as RiotServer)
                  setLinkOpen(true)
                }}
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
      <Divider className="mt-3" />
      {riot ? (
        <div className="flex flex-col items-center gap-4 px-1 py-5 text-center sm:flex-row sm:text-left">
          <span className="relative flex h-[120px] w-[120px] shrink-0">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ink-700">
              {riot.iconURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={riot.iconURL} alt="" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/clover-mark.png" alt="" className="h-[55%] w-[55%] opacity-85" />
              )}
            </span>
            {riot.companionIconURL ? (
              <span className="absolute bottom-0 -right-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-ink-800 bg-ink-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={riot.companionIconURL} alt="" className="h-full w-full object-cover" />
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="font-display text-lg font-extrabold text-white">
                {riot.gameName}
                <span className="text-white/50">#{riot.tagLine}</span>
              </span>
              <Tag scheme="neutral" size="sm">
                {riot.server}
              </Tag>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/40">
                {regionForServer(riot.server)}
              </span>
              {!riot.verified ? (
                <Tooltip label="We couldn't verify this Riot ID with Riot's servers. We'll keep retrying automatically.">
                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-yellow-500/15 px-2 py-0.5 text-[11px] font-semibold text-yellow-400">
                    <AlertTriangle size={12} />
                    Not verified
                  </span>
                </Tooltip>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-white/60">
              {riot.verified ? (riot.tier ? `${riot.tier} ${riot.rank} · ${riot.lp} LP` : 'Unranked') : 'Riot ID could not be verified.'}
            </p>
          </div>
        </div>
      ) : (
        <EmptyRow
          icon={<Shield size={26} className="text-white/50" />}
          title="No Riot account linked"
          hint="Link your Riot ID to show your rank on your profile."
        />
      )}
      {!riot ? (
        <div className="flex justify-center pb-1">
          <Button variant="primary" size="sm" iconLeft={<Plus size={16} />} onClick={() => setLinkOpen(true)}>
            Link Riot account
          </Button>
        </div>
      ) : null}

      <Dialog
        open={linkOpen}
        title={riot ? 'Edit your Riot account' : 'Link your Riot account'}
        onClose={saving ? undefined : () => setLinkOpen(false)}
        actions={
          <>
            <Button variant="subtle" className="text-white" disabled={saving} onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!riotIdValid || saving} onClick={handleLink}>
              {saving ? 'Saving…' : riot ? 'Save changes' : 'Link account'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField
            label="Riot ID"
            hint="Your in-game name and tag, e.g. Player # NA1."
            error={
              (gameNameInput && !gameNameValid) || (tagLineInput && !tagLineValid)
                ? 'Name is 3-16 characters, tag is 3-5 letters/numbers.'
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <Input
                value={gameNameInput}
                onChange={(e) => setGameNameInput(e.target.value)}
                placeholder="Player"
                maxLength={16}
                error={Boolean(gameNameInput) && !gameNameValid}
                className="flex-1"
              />
              <span className="font-display text-lg font-extrabold text-white/50">#</span>
              <Input
                value={tagLineInput}
                onChange={(e) => setTagLineInput(e.target.value)}
                placeholder="NA1"
                maxLength={5}
                error={Boolean(tagLineInput) && !tagLineValid}
                className="w-24"
              />
            </div>
          </FormField>
          <FormField label="Server">
            <ServerSelect value={server} onChange={setServer} />
          </FormField>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Dialog>
    </Card>
  )
}

export function ProfileApp({
  displayName,
  username,
  email,
  photoURL,
  isTeamManager = false,
  teamName = null,
  teamCode = null,
  teamLogoURL = null,
  members = [],
  currentUserId = '',
  riot = null,
}: ProfileAppProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState('Overview')
  const [currentDisplayName, setCurrentDisplayName] = useState(displayName)
  const [currentPhotoURL, setCurrentPhotoURL] = useState(photoURL ?? null)
  const [currentIsTeamManager, setCurrentIsTeamManager] = useState(isTeamManager)
  const [currentTeamName, setCurrentTeamName] = useState(teamName)
  const [currentTeamCode, setCurrentTeamCode] = useState(teamCode)
  const [currentTeamLogoURL, setCurrentTeamLogoURL] = useState(teamLogoURL)
  const [currentMembers, setCurrentMembers] = useState(members)
  const [currentRiot, setCurrentRiot] = useState(riot)
  const handleRiotSaved = (updated: RiotAccountData | null) => setCurrentRiot(updated)
  const onSignOut = () => signOut({ callbackUrl: '/login' })

  const handleTeamSaved = (name: string, code: string, logoURL: string | null) => {
    setCurrentTeamName(name)
    setCurrentTeamCode(code)
    setCurrentTeamLogoURL(logoURL)
    if (currentMembers.length === 0) {
      setCurrentMembers([{ id: currentUserId, displayName: currentDisplayName, photoURL: currentPhotoURL, isManager: true }])
      setCurrentIsTeamManager(true)
    }
  }

  const handleAccountSaved = (name: string, newPhotoURL: string | null) => {
    setCurrentDisplayName(name)
    setCurrentPhotoURL(newPhotoURL)
    setCurrentMembers((prev) => prev.map((m) => (m.id === currentUserId ? { ...m, displayName: name, photoURL: newPhotoURL } : m)))
  }

  const handleLeftTeam = () => {
    setCurrentTeamName(null)
    setCurrentTeamCode(null)
    setCurrentTeamLogoURL(null)
    setCurrentMembers([])
    setCurrentIsTeamManager(false)
  }

  const handleMemberKicked = async (memberId: string) => {
    try {
      await postJson('/api/teams/kick', { memberId }, 'Failed to remove member')
      setCurrentMembers((prev) => prev.filter((m) => m.id !== memberId))
      showToast({ type: 'positive', title: 'Member removed', message: 'They can request a new invite to rejoin.' })
    } catch (err) {
      showToast({
        type: 'danger',
        title: 'Could not remove member',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const handleMemberPromoted = async (memberId: string) => {
    try {
      await postJson('/api/teams/promote', { memberId }, 'Failed to assign manager')
      setCurrentMembers((prev) => prev.map((m) => ({ ...m, isManager: m.id === memberId })))
      setCurrentIsTeamManager(false)
      showToast({ type: 'positive', title: 'Manager updated', message: 'They now manage this squad.' })
    } catch (err) {
      showToast({
        type: 'danger',
        title: 'Could not assign manager',
        message: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-ink-1000">
      <div className="mx-auto max-w-5xl">
        <ProfileHeader
          tab={tab}
          setTab={setTab}
          displayName={currentDisplayName}
          email={email}
          photoURL={currentPhotoURL}
          teamName={currentTeamName}
          teamCode={currentTeamCode}
          onSignOut={onSignOut}
        />
        <div className="px-8 pb-16 pt-7">
          {tab === 'Overview' ? (
            <OverviewTab />
          ) : tab === 'Squad' ? (
            <SquadTab
              isTeamManager={currentIsTeamManager}
              teamName={currentTeamName}
              teamCode={currentTeamCode}
              teamLogoURL={currentTeamLogoURL}
              members={currentMembers}
              currentUserId={currentUserId}
              onTeamSaved={handleTeamSaved}
              onLeftTeam={handleLeftTeam}
              onMemberKicked={handleMemberKicked}
              onMemberPromoted={handleMemberPromoted}
            />
          ) : (
            <SettingsTab
              displayName={currentDisplayName}
              username={username}
              email={email}
              photoURL={currentPhotoURL}
              onSaved={handleAccountSaved}
              riot={currentRiot}
              onRiotSaved={handleRiotSaved}
            />
          )}
        </div>
      </div>
    </div>
  )
}
