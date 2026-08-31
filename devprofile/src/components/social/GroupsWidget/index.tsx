/*
  GroupsWidget — лёгкое превью (замена ComingSoon-заглушки 'dev-groups' в
  panelRegistry.tsx, тот же id). Короткий список моих групп + переход в
  SocialHub («Группы») или сразу в конкретную группу.
*/

import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useAppDispatch } from '../../../hooks/redux'
import { openGroup, setSocialHubOpen } from '../../../store/slices/uiSlice'
import { useGetGroupsQuery } from '../../../store/api/backendApi'
import { PanelHeader } from '../../shared/PanelHeader'
import { EmptyCard } from '../../shared/Card'
import { Avatar } from '../../shared/Avatar'

const PREVIEW_COUNT = 5

export function GroupsWidget() {
  const dispatch = useAppDispatch()
  const { data } = useGetGroupsQuery({ mine: true })

  const groups = data?.groups ?? []

  return (
    <motion.div className="dp-panel overflow-hidden" variants={staggerItemVariants}>
      <PanelHeader
        title="Группы"
        right={
          <button onClick={() => dispatch(setSocialHubOpen(true))} className="text-xs" style={{ background: 'none', border: 'none', color: 'var(--dp-accent)', cursor: 'pointer' }}>
            Все →
          </button>
        }
      />

      {groups.length === 0 ? (
        <EmptyCard message="Вы пока не состоите ни в одной группе" />
      ) : (
        <div className="flex flex-col">
          {groups.slice(0, PREVIEW_COUNT).map((g) => (
            <button
              key={g.id}
              onClick={() => dispatch(openGroup(g.id))}
              className="flex items-center gap-2.5 px-3 py-2 text-left w-full"
              style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--dp-border)', cursor: 'pointer' }}
            >
              <Avatar src={g.avatar} name={g.name} size={28} radius={6} />
              <span className="text-xs truncate flex-1" style={{ color: 'var(--dp-text-primary)' }}>{g.name}</span>
              <span className="text-[10px] shrink-0" style={{ color: 'var(--dp-text-muted)' }}>{g.memberCount}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
