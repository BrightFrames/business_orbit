import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

// DELETE: Delete a chapter and all its memberships
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params
    
    // Validate chapter ID
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid chapter ID',
        message: 'Chapter ID is required'
      }, { status: 400 })
    }
    
    // Start a transaction to ensure data consistency
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // First, delete all memberships for this chapter
      const deleteMembershipsResult = await client.query(
        'DELETE FROM chapter_memberships WHERE chapter_id = $1',
        [chapterId]
      )
      
      // Then, delete the chapter itself
      const deleteChapterResult = await client.query(
        'DELETE FROM chapters WHERE id = $1 RETURNING id, name, location_city',
        [chapterId]
      )
      
      // Check if chapter was found and deleted
      if (deleteChapterResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({
          success: false,
          error: 'Chapter not found',
          message: 'No chapter found with the provided ID'
        }, { status: 404 })
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({ 
        success: true,
        message: 'Chapter and all memberships deleted successfully',
        deletedChapter: deleteChapterResult.rows[0],
        deletedMemberships: deleteMembershipsResult.rowCount
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete chapter',
      message: 'Database error occurred while deleting chapter'
    }, { status: 500 })
  }
}

// GET: Get a specific chapter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params
    
    // Validate chapter ID
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid chapter ID',
        message: 'Chapter ID is required'
      }, { status: 400 })
    }
    
    const result = await pool.query(
      'SELECT id, name, location_city, created_at FROM chapters WHERE id = $1',
      [chapterId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chapter not found',
        message: 'No chapter found with the provided ID'
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true,
      chapter: result.rows[0]
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch chapter',
      message: 'Database error occurred while fetching chapter'
    }, { status: 500 })
  }
}


