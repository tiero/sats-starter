// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from "next";
import { Project } from "../../lib/interfaces";

const supabaseUrl = process.env.SUPABASE_URL || 'https://rtxzwpnvsjgwwvnsholc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseKey) {
  throw new Error('SUPABASE_KEY is missing');
}
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{}>,
) {
  if (!req || !req.body)
    return res.status(400).send('malformed request');

  const expectedProperties = ['title', 'contribution'];
  if (!expectedProperties.every(property => property in req.body)) {
    return res.status(400).send(
      `bad params`
    );
  }

  const expectedPropertiesOfContribution = ['txid', 'sats'];
  if (!expectedPropertiesOfContribution.every(property => property in req.body.contribution)) {
    return res.status(400).send(
      `bad params`
    );
  }

  const {title, contribution} = req.body;
  const {txid, sats} = contribution;

  const payload = {title, txid, sats};
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select();

  if (error) 
    return res.status(500).json(error);

  res.status(200).json(data);
}
