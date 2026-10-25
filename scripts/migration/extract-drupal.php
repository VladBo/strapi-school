<?php

/**
 * Extract a normalized Drupal 7 content snapshot.
 *
 * Run through Drush so the Drupal API and database are bootstrapped:
 *   drush php-script /tmp/extract-drupal.php > source.json
 */

function migration_iso_date($timestamp) {
  return $timestamp ? gmdate('c', (int) $timestamp) : NULL;
}

function migration_scalar_array($value) {
  if (is_array($value)) {
    $result = array();
    foreach ($value as $key => $item) {
      $result[$key] = migration_scalar_array($item);
    }
    return $result;
  }
  if (is_object($value)) {
    return migration_scalar_array((array) $value);
  }
  return $value;
}

function migration_field_items($node, $field_name) {
  $items = field_get_items('node', $node, $field_name);
  if (!$items) {
    return array();
  }

  $normalized = array();
  foreach ($items as $item) {
    $entry = migration_scalar_array($item);
    if (!empty($item['fid'])) {
      $file = file_load($item['fid']);
      if ($file) {
        $entry['file'] = array(
          'fid' => (int) $file->fid,
          'filename' => $file->filename,
          'uri' => $file->uri,
          'filemime' => $file->filemime,
          'filesize' => (int) $file->filesize,
        );
      }
    }
    if (!empty($item['tid'])) {
      $term = taxonomy_term_load($item['tid']);
      if ($term) {
        $entry['term'] = array(
          'tid' => (int) $term->tid,
          'name' => $term->name,
        );
      }
    }
    $normalized[] = $entry;
  }
  return $normalized;
}

$nids = array();
foreach (db_query('SELECT nid FROM {node} ORDER BY nid') as $record) {
  $nids[] = (int) $record->nid;
}

$nodes = array();
foreach (node_load_multiple($nids) as $node) {
  $account = user_load($node->uid);
  $alias = db_query_range(
    'SELECT alias FROM {url_alias} WHERE source = :source ORDER BY pid DESC',
    0,
    1,
    array(':source' => 'node/' . $node->nid)
  )->fetchField();

  $fields = array();
  $instances = field_info_instances('node', $node->type);
  foreach (array_keys($instances) as $field_name) {
    $fields[$field_name] = migration_field_items($node, $field_name);
  }

  $body_items = !empty($fields['body']) ? $fields['body'] : (!empty($fields['field_body']) ? $fields['field_body'] : array());
  $body = !empty($body_items[0]['value']) ? $body_items[0]['value'] : '';
  $summary = !empty($body_items[0]['summary']) ? $body_items[0]['summary'] : '';

  $nodes[] = array(
    'nid' => (int) $node->nid,
    'vid' => (int) $node->vid,
    'type' => $node->type,
    'title' => $node->title,
    'status' => (int) $node->status,
    'language' => $node->language,
    'createdAt' => migration_iso_date($node->created),
    'updatedAt' => migration_iso_date($node->changed),
    'author' => array(
      'uid' => (int) $node->uid,
      'name' => $account ? $account->name : NULL,
    ),
    'sourcePath' => 'node/' . $node->nid,
    'alias' => $alias ?: NULL,
    'bodyHtml' => $body,
    'bodySummary' => $summary,
    'fields' => $fields,
  );
}

$aliases = array();
foreach (db_query('SELECT pid, source, alias, language FROM {url_alias} ORDER BY pid') as $record) {
  $aliases[] = array(
    'pid' => (int) $record->pid,
    'source' => $record->source,
    'alias' => $record->alias,
    'language' => $record->language,
  );
}

$files = array();
foreach (db_query('SELECT fid, uid, filename, uri, filemime, filesize, status, timestamp FROM {file_managed} ORDER BY fid') as $record) {
  $files[] = array(
    'fid' => (int) $record->fid,
    'uid' => (int) $record->uid,
    'filename' => $record->filename,
    'uri' => $record->uri,
    'filemime' => $record->filemime,
    'filesize' => (int) $record->filesize,
    'status' => (int) $record->status,
    'createdAt' => migration_iso_date($record->timestamp),
  );
}

$menus = array();
$menu_names = array('main-menu', 'menu-footer-menu', 'menu-services');
foreach ($menu_names as $menu_name) {
  $menus[$menu_name] = array();
  $query = db_query(
    'SELECT mlid, plid, link_path, router_path, link_title, options, module, hidden, external, has_children, expanded, weight, depth FROM {menu_links} WHERE menu_name = :menu ORDER BY depth, weight, mlid',
    array(':menu' => $menu_name)
  );
  foreach ($query as $record) {
    $menus[$menu_name][] = array(
      'mlid' => (int) $record->mlid,
      'plid' => (int) $record->plid,
      'title' => $record->link_title,
      'path' => $record->link_path,
      'routerPath' => $record->router_path,
      'options' => migration_scalar_array(unserialize($record->options)),
      'module' => $record->module,
      'hidden' => (int) $record->hidden,
      'external' => (int) $record->external,
      'hasChildren' => (int) $record->has_children,
      'expanded' => (int) $record->expanded,
      'weight' => (int) $record->weight,
      'depth' => (int) $record->depth,
      'language' => LANGUAGE_NONE,
    );
  }
}

$h5p = array();
$h5p_query = db_query(
  'SELECT hn.content_id, hn.nid, hn.embed_type, hn.main_library_id, hn.content_type, hn.slug, hn.default_language, hn.license, hl.machine_name, hl.major_version, hl.minor_version FROM {h5p_nodes} hn LEFT JOIN {h5p_libraries} hl ON hl.library_id = hn.main_library_id ORDER BY hn.nid'
);
foreach ($h5p_query as $record) {
  $h5p[] = array(
    'contentId' => (int) $record->content_id,
    'nid' => (int) $record->nid,
    'embedType' => $record->embed_type,
    'contentType' => $record->content_type,
    'slug' => $record->slug,
    'defaultLanguage' => $record->default_language,
    'license' => $record->license,
    'library' => $record->machine_name ? $record->machine_name . ' ' . $record->major_version . '.' . $record->minor_version : NULL,
  );
}

$comments = array();
$comment_query = db_query(
  'SELECT c.cid, c.pid, c.nid, c.uid, c.name, c.subject, c.status, c.created, b.comment_body_value AS body, b.comment_body_format AS format FROM {comment} c LEFT JOIN {field_data_comment_body} b ON b.entity_id = c.cid AND b.deleted = 0 ORDER BY c.cid'
);
foreach ($comment_query as $record) {
  $comments[] = array(
    'cid' => (int) $record->cid,
    'pid' => (int) $record->pid,
    'nid' => (int) $record->nid,
    'uid' => (int) $record->uid,
    'name' => $record->name,
    'subject' => $record->subject,
    'status' => (int) $record->status,
    'createdAt' => migration_iso_date($record->created),
    'bodyHtml' => $record->body,
    'format' => $record->format,
  );
}

$submissions_by_id = array();
$submission_query = db_query(
  'SELECT s.sid, s.nid, s.uid, s.is_draft, s.submitted, d.cid, d.no, d.data, c.name, c.form_key, c.type FROM {webform_submissions} s LEFT JOIN {webform_submitted_data} d ON d.sid = s.sid AND d.nid = s.nid LEFT JOIN {webform_component} c ON c.nid = d.nid AND c.cid = d.cid ORDER BY s.sid, d.cid, d.no'
);
foreach ($submission_query as $record) {
  $sid = (int) $record->sid;
  if (!isset($submissions_by_id[$sid])) {
    $submissions_by_id[$sid] = array(
      'sid' => $sid,
      'nid' => (int) $record->nid,
      'uid' => (int) $record->uid,
      'isDraft' => (int) $record->is_draft,
      'submittedAt' => migration_iso_date($record->submitted),
      'values' => array(),
    );
  }
  if ($record->cid !== NULL) {
    $submissions_by_id[$sid]['values'][] = array(
      'cid' => (int) $record->cid,
      'name' => $record->name,
      'formKey' => $record->form_key,
      'type' => $record->type,
      'delta' => (int) $record->no,
      'value' => $record->data,
    );
  }
}

$result = array(
  'exportedAt' => gmdate('c'),
  'source' => array(
    'platform' => 'Drupal',
    'version' => defined('VERSION') ? VERSION : NULL,
  ),
  'nodes' => $nodes,
  'aliases' => $aliases,
  'files' => $files,
  'menus' => $menus,
  'h5p' => $h5p,
  'restricted' => array(
    'comments' => $comments,
    'webformSubmissions' => array_values($submissions_by_id),
  ),
);

$json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === FALSE) {
  fwrite(STDERR, 'JSON encoding failed: ' . json_last_error_msg() . PHP_EOL);
  exit(1);
}

fwrite(STDOUT, $json . PHP_EOL);
