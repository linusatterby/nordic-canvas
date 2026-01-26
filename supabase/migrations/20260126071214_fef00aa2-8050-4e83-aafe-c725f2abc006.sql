-- Update seed_demo_scenario to also create demo housing listings
CREATE OR REPLACE FUNCTION public.seed_demo_scenario(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demo_job_id uuid;
  v_demo_match_id uuid;
  v_demo_card_id uuid;
  v_thread_id uuid;
  v_booking_id uuid;
  v_offer_id uuid;
  v_user_id uuid := auth.uid();
  v_housing_id_1 uuid;
  v_housing_id_2 uuid;
  v_demo_host_id uuid;
  v_housing_thread_id uuid;
BEGIN
  -- 1. Create/find demo job
  SELECT id INTO v_demo_job_id FROM job_posts 
  WHERE org_id = p_org_id AND is_demo = true AND listing_type = 'job'
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_demo_job_id IS NULL THEN
    INSERT INTO job_posts (
      org_id, title, role_key, location, start_date, end_date, 
      housing_offered, housing_text, is_demo, status, listing_type
    ) VALUES (
      p_org_id, 'Demo Sommarjobb', 'server', 'Stockholm', 
      CURRENT_DATE + 30, CURRENT_DATE + 120,
      true, 'Delat rum i personalboende', true, 'published', 'job'
    ) RETURNING id INTO v_demo_job_id;
  END IF;
  
  -- 2. Get a demo card for match
  SELECT id INTO v_demo_card_id FROM demo_talent_cards 
  WHERE is_demo = true ORDER BY RANDOM() LIMIT 1;
  
  -- 3. Create demo match
  INSERT INTO demo_matches (org_id, job_post_id, demo_card_id, status, is_seeded)
  VALUES (p_org_id, v_demo_job_id, v_demo_card_id, 'matched', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_demo_match_id;
  
  IF v_demo_match_id IS NULL THEN
    SELECT id INTO v_demo_match_id FROM demo_matches 
    WHERE org_id = p_org_id AND is_seeded = true LIMIT 1;
  END IF;
  
  -- 4. Create demo chat thread
  INSERT INTO demo_chat_threads (org_id, demo_match_id)
  VALUES (p_org_id, v_demo_match_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_thread_id;
  
  IF v_thread_id IS NULL THEN
    SELECT id INTO v_thread_id FROM demo_chat_threads 
    WHERE org_id = p_org_id LIMIT 1;
  END IF;
  
  -- 5. Create demo messages
  IF v_thread_id IS NOT NULL THEN
    INSERT INTO demo_chat_messages (thread_id, sender_type, body)
    VALUES 
      (v_thread_id, 'talent', 'Hej! Jag såg ert jobb och är väldigt intresserad.'),
      (v_thread_id, 'employer', 'Tack för ditt intresse! Kan du berätta lite om dig själv?')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 6. Create demo booking
  INSERT INTO demo_shift_bookings (org_id, demo_card_id, start_ts, end_ts, is_seeded)
  VALUES (
    p_org_id, v_demo_card_id, 
    now() + interval '7 days', 
    now() + interval '7 days' + interval '8 hours',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_booking_id;
  
  -- 7. Create demo release offer
  IF v_booking_id IS NOT NULL THEN
    INSERT INTO demo_release_offers (from_org_id, demo_booking_id, status)
    VALUES (p_org_id, v_booking_id, 'open')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 8. Create demo borrow request
  INSERT INTO borrow_requests (
    org_id, created_by, role_key, location, start_ts, end_ts, 
    scope, message, is_demo
  ) VALUES (
    p_org_id, v_user_id, 'server', 'Stockholm',
    now() + interval '14 days',
    now() + interval '14 days' + interval '6 hours',
    'local', 'Vi behöver förstärkning till helgen!', true
  ) ON CONFLICT DO NOTHING;
  
  -- 9. Create demo OFFER
  INSERT INTO offers (
    org_id, 
    talent_user_id, 
    match_id,
    listing_id,
    listing_type,
    status,
    role_title,
    location,
    start_date,
    end_date,
    hours_per_week,
    hourly_rate,
    currency,
    housing_included,
    housing_note,
    message,
    created_by,
    sent_at
  ) VALUES (
    p_org_id,
    v_user_id,
    NULL,
    v_demo_job_id,
    'job',
    'sent',
    'Sommarjobb - Servering',
    'Stockholm',
    CURRENT_DATE + 30,
    CURRENT_DATE + 120,
    40,
    165,
    'SEK',
    true,
    'Delat rum i personalboende ingår',
    'Vi vill gärna ha dig med i teamet! Hör av dig om du har frågor.',
    v_user_id,
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_offer_id;
  
  -- Log the offer event
  IF v_offer_id IS NOT NULL THEN
    INSERT INTO offer_events (offer_id, actor_user_id, event_type, metadata)
    VALUES (v_offer_id, v_user_id, 'sent', '{"demo": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 10. Create demo housing listings
  -- Use current user as demo host (they likely have host role or we'll just use them)
  v_demo_host_id := v_user_id;
  
  -- Create first housing listing if it doesn't exist
  SELECT id INTO v_housing_id_1 FROM job_posts 
  WHERE listing_type = 'housing' AND is_demo = true AND host_user_id = v_demo_host_id
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_housing_id_1 IS NULL THEN
    INSERT INTO job_posts (
      org_id, title, role_key, location, start_date, end_date,
      listing_type, status, is_demo, host_user_id,
      rent_per_month, rooms, furnished, available_from, available_to,
      approx_area, housing_text
    ) VALUES (
      p_org_id, 'Mysig etta nära centrum', 'housing', 'Stockholm', 
      CURRENT_DATE, CURRENT_DATE + 180,
      'housing', 'published', true, v_demo_host_id,
      6500, 1, true, CURRENT_DATE + 7, CURRENT_DATE + 150,
      'Södermalm, Stockholm', 'Fullt möblerad lägenhet med balkong. Perfekt för säsongsarbetare!'
    ) RETURNING id INTO v_housing_id_1;
  END IF;

  -- Create second housing listing
  SELECT id INTO v_housing_id_2 FROM job_posts 
  WHERE listing_type = 'housing' AND is_demo = true AND host_user_id = v_demo_host_id
    AND id != COALESCE(v_housing_id_1, '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY created_at DESC LIMIT 1;

  IF v_housing_id_2 IS NULL THEN
    INSERT INTO job_posts (
      org_id, title, role_key, location, start_date, end_date,
      listing_type, status, is_demo, host_user_id,
      rent_per_month, rooms, furnished, available_from, available_to,
      approx_area, housing_text
    ) VALUES (
      p_org_id, 'Delat rum i villa', 'housing', 'Åre', 
      CURRENT_DATE, CURRENT_DATE + 180,
      'housing', 'published', true, v_demo_host_id,
      3500, 1, true, CURRENT_DATE + 14, CURRENT_DATE + 120,
      'Åre by', 'Delat rum i stor villa nära liften. Gemensamt kök och vardagsrum.'
    ) RETURNING id INTO v_housing_id_2;
  END IF;

  -- 11. Create demo housing thread and messages if talent has offer
  IF v_housing_id_1 IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Create housing thread between demo talent and demo host
    INSERT INTO threads (
      thread_type, housing_listing_id, host_user_id, talent_user_id
    ) VALUES (
      'housing', v_housing_id_1, v_demo_host_id, v_user_id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_housing_thread_id;

    IF v_housing_thread_id IS NULL THEN
      SELECT id INTO v_housing_thread_id FROM threads
      WHERE thread_type = 'housing' 
        AND housing_listing_id = v_housing_id_1 
        AND talent_user_id = v_user_id
      LIMIT 1;
    END IF;

    -- Create demo messages in housing thread
    IF v_housing_thread_id IS NOT NULL THEN
      INSERT INTO messages (thread_id, sender_user_id, body)
      VALUES 
        (v_housing_thread_id, v_user_id, 'Hej! Jag är intresserad av boendet. Är det fortfarande ledigt?'),
        (v_housing_thread_id, v_demo_host_id, 'Hej! Ja, det är ledigt. Har du fått ett jobb i området?')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'demo_job_id', v_demo_job_id,
    'demo_match_id', v_demo_match_id,
    'demo_thread_id', v_thread_id,
    'demo_booking_id', v_booking_id,
    'demo_offer_id', v_offer_id,
    'demo_housing_ids', jsonb_build_array(v_housing_id_1, v_housing_id_2),
    'demo_housing_thread_id', v_housing_thread_id
  );
END;
$$;