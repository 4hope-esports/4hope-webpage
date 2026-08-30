'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Check, Crown, LogOut, Mail, Pencil, Plus, Link as LinkIcon, LogOutIcon, Search, Shield, User, UserX, Users } from 'lucide-react'
import { Avatar, Button, Card, Dialog, Divider, FormField, IconButton, ImageCropper, Input, Tabs, Tag, Tooltip, ValidatedInput } from '@/components/ui'
import { useToast } from '@/components/ui/ToastProvider'
import { defaultTeamCode, isValidTeamCode, normalizeTeamName } from '@/lib/team'

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
        <Tabs tabs={['Overview', 'Settings']} value={tab} onChange={setTab} />
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

function OverviewTab({
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
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">// Team</span>
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
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">// Members</span>
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

  useEffect(() => {
    if (open) {
      setNewOwnerId(otherMembers[0]?.id ?? '')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleLeave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/teams/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsSuccessor ? { newOwnerId } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to leave team')
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
      const res = await fetch('/api/teams/invite', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create invite link')

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
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [pendingCrop, setPendingCrop] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(initial?.logoURL ?? null)
  const [cropOpen, setCropOpen] = useState(false)
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
    setRawImage(null)
    setPendingCrop(null)
    setCroppedImage(initial?.logoURL ?? null)
    setCropOpen(false)
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawImage(reader.result as string)
      setPendingCrop(null)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropDone = () => {
    setCroppedImage(pendingCrop)
    setCropOpen(false)
  }

  const handleCropCancel = () => {
    setCropOpen(false)
    if (!croppedImage) setRawImage(null)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const finalName = nameValid ? nameCheck.value : name
    try {
      const res = await fetch('/api/teams', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          code: effectiveCode,
          logoDataUrl: croppedImage,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${isEdit ? 'save' : 'create'} team`)
      onSaved(finalName, effectiveCode, croppedImage)
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
          {croppedImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={croppedImage} alt="" className="h-16 w-16 rounded-[14px] object-cover" />
              <button
                type="button"
                onClick={() => setCropOpen(true)}
                className="text-xs text-gold-500 underline-offset-2 hover:underline"
              >
                Edit crop
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawImage(null)
                  setCroppedImage(null)
                }}
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
                onChange={(e) => handleFile(e.target.files?.[0])}
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

      <Dialog
        open={cropOpen}
        title="Customize picture"
        onClose={handleCropCancel}
        closeOnBackdropClick={false}
        className="max-w-[600px]"
        actions={
          <>
            <Button variant="subtle" className="text-white" onClick={handleCropCancel}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!pendingCrop} onClick={handleCropDone}>
              Done
            </Button>
          </>
        }
      >
        {rawImage || croppedImage ? (
          <div className="flex justify-center">
            <ImageCropper src={rawImage ?? croppedImage!} onChange={setPendingCrop} />
          </div>
        ) : null}
      </Dialog>
    </Dialog>
  )
}

function SettingsTab({
  displayName,
  username,
  email,
  photoURL,
  onSaved,
}: {
  displayName: string
  username: string
  email: string
  photoURL?: string | null
  onSaved: (displayName: string, photoURL: string | null) => void
}) {
  const { showToast } = useToast()
  const [draftName, setDraftName] = useState(displayName)
  const [draftPhoto, setDraftPhoto] = useState<string | null>(photoURL ?? null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [rawPhoto, setRawPhoto] = useState<string | null>(null)
  const [pendingPhotoCrop, setPendingPhotoCrop] = useState<string | null>(null)
  const [photoCropOpen, setPhotoCropOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const nameChanged = draftName.trim().length > 0 && draftName.trim() !== displayName
  const photoChanged = removePhoto || draftPhoto !== (photoURL ?? null)
  const hasChanges = nameChanged || photoChanged

  const handlePhotoFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawPhoto(reader.result as string)
      setPendingPhotoCrop(null)
      setPhotoCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoCropDone = () => {
    if (pendingPhotoCrop) {
      setDraftPhoto(pendingPhotoCrop)
      setRemovePhoto(false)
    }
    setPhotoCropOpen(false)
    setRawPhoto(null)
  }

  const handlePhotoCropCancel = () => {
    setPhotoCropOpen(false)
    setRawPhoto(null)
  }

  const handleRemovePhoto = () => {
    setDraftPhoto(null)
    setRemovePhoto(true)
  }

  const handleConfirmSave = async () => {
    setSaving(true)
    try {
      const trimmed = draftName.trim()
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: trimmed,
          ...(removePhoto ? { removePhoto: true } : draftPhoto !== (photoURL ?? null) ? { photoDataUrl: draftPhoto } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      onSaved(trimmed, removePhoto ? null : draftPhoto)
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
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">// Account</span>
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
              {draftPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draftPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-4xl font-extrabold text-gold-500">
                  {(draftName || displayName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100">
                <Pencil size={24} className="text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoFile(e.target.files?.[0])}
              />
            </label>
            {draftPhoto ? (
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
            <p>{removePhoto ? 'Your profile photo will revert to your Google account photo.' : 'Your profile photo will be updated.'}</p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={photoCropOpen}
        title="Customize picture"
        onClose={handlePhotoCropCancel}
        closeOnBackdropClick={false}
        className="max-w-[600px]"
        actions={
          <>
            <Button variant="subtle" className="text-white" onClick={handlePhotoCropCancel}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!pendingPhotoCrop} onClick={handlePhotoCropDone}>
              Done
            </Button>
          </>
        }
      >
        {rawPhoto ? (
          <div className="flex justify-center">
            <ImageCropper src={rawPhoto} onChange={setPendingPhotoCrop} />
          </div>
        ) : null}
      </Dialog>
    </div>
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
      const res = await fetch('/api/teams/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')
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
      const res = await fetch('/api/teams/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign manager')
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
            <OverviewTab
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
            />
          )}
        </div>
      </div>
    </div>
  )
}
