import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { notifyParents, notifyChild } from '@/lib/notifications';
import { Mission, MissionSubmission } from '@/types';

interface MissionsState {
  missions: Mission[];
  submissions: MissionSubmission[];
  loading: boolean;

  fetchMissions: (familyId: string) => Promise<void>;
  createMission: (mission: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<string>;
  updateMission: (missionId: string, updates: Partial<Pick<Mission, 'title' | 'description' | 'points_reward' | 'recurrence'>>) => Promise<void>;
  archiveMission: (missionId: string) => Promise<void>;
  fetchSubmissions: (familyId: string) => Promise<void>;
  claimMission: (missionId: string, childId: string, familyId: string, assignedByParent?: boolean) => Promise<void>;
  submitMission: (missionId: string, childId: string, familyId: string, note?: string) => Promise<void>;
  completeClaim: (submissionId: string, familyId: string, note?: string) => Promise<void>;
  validateSubmission: (submissionId: string, status: 'approved' | 'rejected', validatedBy: string) => Promise<void>;
  parentDirectValidate: (missionId: string, childId: string, familyId: string, validatedBy: string) => Promise<void>;
}

export const useMissionsStore = create<MissionsState>((set, get) => ({
  missions: [],
  submissions: [],
  loading: false,

  fetchMissions: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ missions: (data as Mission[]) ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  createMission: async (mission) => {
    const { data, error } = await supabase.from('missions').insert(mission).select('id').single();
    if (error) throw error;
    await get().fetchMissions(mission.family_id);
    return data.id as string;
  },

  updateMission: async (missionId, updates) => {
    const { error } = await supabase.from('missions')
      .update(updates)
      .eq('id', missionId);
    if (error) throw error;

    set((state) => ({
      missions: state.missions.map((m) =>
        m.id === missionId ? { ...m, ...updates } : m
      ),
    }));
  },

  archiveMission: async (missionId: string) => {
    // Delete non-completed submissions (claimed/pending) linked to this mission
    const { error: subError } = await supabase
      .from('mission_submissions')
      .delete()
      .eq('mission_id', missionId)
      .in('status', ['claimed', 'pending']);
    if (subError) throw subError;

    const { error } = await supabase
      .from('missions')
      .update({ status: 'archived' })
      .eq('id', missionId);
    if (error) throw error;

    set((state) => ({
      missions: state.missions.filter((m) => m.id !== missionId),
      submissions: state.submissions.filter(
        (s) => !(s.mission_id === missionId && (s.status === 'claimed' || s.status === 'pending'))
      ),
    }));
  },

  fetchSubmissions: async (familyId: string) => {
    const { data, error } = await supabase
      .from('mission_submissions')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ submissions: (data as MissionSubmission[]) ?? [] });
  },

  claimMission: async (missionId, childId, familyId, assignedByParent) => {
    const { error } = await supabase.from('mission_submissions').insert({
      mission_id: missionId,
      child_id: childId,
      family_id: familyId,
      status: 'claimed',
    });
    if (error) throw error;
    await get().fetchSubmissions(familyId);

    // Send notifications in the background (non-blocking)
    const mission = get().missions.find((m) => m.id === missionId);
    if (mission) {
      if (assignedByParent) {
        // Parent assigned → notify child that a mission is available
        notifyChild(
          childId,
          familyId,
          mission.title,
          `La mission "${mission.title}" t'a ete attribuee !`,
          'mission_available',
          { screen: '(child)/missions', missionId }
        ).catch(() => { });
      } else {
        // Child claimed → notify parents
        const { data: childProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', childId)
          .single();

        if (childProfile) {
          notifyParents(
            familyId,
            'Mission prise',
            `${childProfile.display_name} a pris la mission "${mission.title}"`,
            'mission_claimed',
            { screen: '(parent)/missions', missionId }
          ).catch(() => { });
        }
      }
    }
  },

  submitMission: async (missionId, childId, familyId, note) => {
    const { error } = await supabase.from('mission_submissions').insert({
      mission_id: missionId,
      child_id: childId,
      family_id: familyId,
      note: note ?? null,
    });
    if (error) throw error;
    await get().fetchSubmissions(familyId);
  },

  completeClaim: async (submissionId, familyId, note) => {
    const { data, error } = await supabase.from('mission_submissions')
      .update({
        status: 'pending',
        note: note ?? null,
      })
      .eq('id', submissionId)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Failed to update submission. Please try again.');
    await get().fetchSubmissions(familyId);

    // Notify parents that a child completed a mission
    const submission = get().submissions.find((s) => s.id === submissionId);
    if (submission) {
      const mission = get().missions.find((m) => m.id === submission.mission_id);
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', submission.child_id)
        .single();

      if (mission && childProfile) {
        notifyParents(
          familyId,
          'Mission soumise',
          `${childProfile.display_name} a termine la mission "${mission.title}" et attend ta validation`,
          'mission_submitted',
          { screen: '(parent)/missions', missionId: mission.id }
        ).catch(() => { });
      }
    }
  },

  validateSubmission: async (submissionId, status, validatedBy) => {
    const { error } = await supabase
      .from('mission_submissions')
      .update({
        status,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw error;

    // Refresh submissions list after validation
    const submission = get().submissions.find((s) => s.id === submissionId);
    if (submission?.family_id) {
      await get().fetchSubmissions(submission.family_id);
    }

    // Notify the child about the validation result
    if (submission) {
      const mission = get().missions.find((m) => m.id === submission.mission_id);
      if (mission) {
        const notifType = status === 'approved' ? 'mission_validated' : 'mission_rejected';
        const title = status === 'approved' ? 'Mission validee' : 'Mission refusee';
        const body = status === 'approved'
          ? `Ta mission "${mission.title}" a ete approuvee ! Tu as gagne ${mission.points_reward} points`
          : `Ta mission "${mission.title}" a ete refusee`;

        notifyChild(
          submission.child_id,
          submission.family_id,
          title,
          body,
          notifType,
          { screen: '(child)/missions', missionId: mission.id }
        ).catch(() => { });
      }
    }
  },

  parentDirectValidate: async (missionId, childId, familyId, validatedBy) => {
    // Step 1: Insert submission as 'claimed'
    const { data, error: insertError } = await supabase.from('mission_submissions')
      .insert({
        mission_id: missionId,
        child_id: childId,
        family_id: familyId,
        status: 'claimed',
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    // Step 2: Update to 'approved' so the AFTER UPDATE trigger fires and credits points
    const { error: updateError } = await supabase.from('mission_submissions')
      .update({
        status: 'approved',
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    if (updateError) throw updateError;

    await get().fetchSubmissions(familyId);

    // Notify the child
    const mission = get().missions.find((m) => m.id === missionId);
    if (mission) {
      notifyChild(
        childId,
        familyId,
        'Mission validee',
        `Ta mission "${mission.title}" a ete approuvee ! Tu as gagne ${mission.points_reward} points`,
        'mission_validated',
        { screen: '(child)/missions', missionId }
      ).catch(() => { });
    }
  },
}));
