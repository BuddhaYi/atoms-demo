import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const versions = await prisma.codeVersion.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: 'asc' },
    })
    return NextResponse.json(versions)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const versions: Array<{
      id: string
      version_number: number
      files: Record<string, string>
      prompt: string
      agent_name: string
      model_used: string
      tokens_used: number
      created_at: string
    }> = body.versions

    if (!Array.isArray(versions)) {
      return NextResponse.json(
        { error: 'versions must be an array' },
        { status: 400 }
      )
    }

    // Delete existing versions and bulk insert (replace strategy)
    await prisma.$transaction([
      prisma.codeVersion.deleteMany({ where: { projectId: id } }),
      prisma.codeVersion.createMany({
        data: versions.map((v) => ({
          id: v.id,
          projectId: id,
          versionNumber: v.version_number,
          files: (v.files || {}) as Prisma.InputJsonValue,
          prompt: v.prompt || '',
          agentName: v.agent_name || '',
          modelUsed: v.model_used || '',
          tokensUsed: v.tokens_used || 0,
          createdAt: new Date(v.created_at),
        })),
      }),
    ])

    return NextResponse.json({ success: true, count: versions.length })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save versions' },
      { status: 500 }
    )
  }
}
