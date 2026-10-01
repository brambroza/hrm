import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import ClockView from '@/components/clock/ClockView';
import { callClock } from '@/services/clock';
import { initLiff, LIFF_ID } from '@/lib/liff';
import { locate } from '@/lib/clock/locate';
import { evaluatePosition } from '@/lib/clock/geofence';
import { planPunch } from '@/lib/clock/punch';
import { supabase } from '@/lib/customSupabaseClient';
import { getThaiISODate } from '@/utils/helpers';

/**
 * Clock in or out from a phone. Works in LINE (LIFF) and in a browser with an
 * app login. The screen judges the position itself so the employee sees the
 * verdict before pressing; the server judges it again when they do.
 */
const ClockPage = () => {
  const [stage, setStage] = useState('loading');
  const [source, setSource] = useState('mobile');
  const [employee, setEmployee] = useState(null);
  const [sites, setSites] = useState([]);
  const [days, setDays] = useState([]);
  const [position, setPosition] = useState(null);
  const [positionError, setPositionError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linkForm, setLinkForm] = useState({ employeeCode: '', nationalId: '' });
  const [now, setNow] = useState(() => new Date().toISOString());
  const lineToken = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 15000);
    return () => clearInterval(timer);
  }, []);

  /** Read the phone's position. */
  const findPosition = useCallback(async () => {
    setLocating(true);
    setPositionError(null);
    try {
      setPosition(await locate());
    } catch (problem) {
      setPosition(null);
      setPositionError(problem.message);
    } finally {
      setLocating(false);
    }
  }, []);

  /** Ask the server who this is and what it knows. */
  const loadStatus = useCallback(async () => {
    const status = await callClock('status', lineToken.current ? { lineIdToken: lineToken.current } : {});
    if (!status.linked) {
      setStage('link');
      return;
    }
    setEmployee(status.employee);
    setSites(status.sites || []);
    setDays(status.days || []);
    setStage('ready');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const liff = await initLiff(LIFF_ID);
        if (cancelled) return;
        if (liff.available && liff.idToken) {
          lineToken.current = liff.idToken;
          setSource('line');
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data?.session) {
            setStage('login');
            return;
          }
        }
        await loadStatus();
        findPosition();
      } catch (problem) {
        if (!cancelled) {
          setStage('ready');
          setError(problem.message || String(problem));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus, findPosition]);

  const geofence = useMemo(() => (stage === 'ready' ? evaluatePosition(position, sites) : null), [stage, position, sites]);
  const plan = useMemo(() => (stage === 'ready' ? planPunch(days, now, getThaiISODate()) : null), [stage, days, now]);

  /** Send the punch. */
  const punch = async () => {
    if (!position) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const answer = await callClock('punch', {
        position: { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy },
        ...(lineToken.current ? { lineIdToken: lineToken.current } : {}),
      });
      setResult(answer);
      if (navigator.vibrate) navigator.vibrate(60);
      await loadStatus();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  /** Tie this LINE account to an employee. */
  const link = async () => {
    setBusy(true);
    setError(null);
    try {
      await callClock('link', { lineIdToken: lineToken.current, employeeCode: linkForm.employeeCode, nationalId: linkForm.nationalId });
      await loadStatus();
      findPosition();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>ลงเวลาทำงาน - GoAlong HR</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <ClockView
        stage={stage}
        source={source}
        employee={employee}
        position={position}
        positionError={positionError}
        locating={locating}
        geofence={geofence}
        plan={plan}
        result={result}
        error={error}
        busy={busy}
        days={days}
        linkForm={linkForm}
        now={now}
        onLocate={findPosition}
        onPunch={punch}
        onLinkField={(key, value) => setLinkForm((current) => ({ ...current, [key]: value }))}
        onLink={link}
      />
    </>
  );
};

export default ClockPage;
